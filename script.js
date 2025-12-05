// script.js

// === 定数とグローバル変数 ===
const ROOM_NAME = 'black_hole'; // 要件で指定された単一のルーム名
const TOKEN_TTL_SECONDS = 3600; // トークンの有効期限 (1時間)
const WARNING_TRIGGER_SECONDS = 55 * 60; // 警告を表示する時間 (55分 = 3300秒)

let skywayPeer = null; // SkywayのPeerインスタンス
let localStream = null; // ローカルのメディアストリーム
let localRoom = null; // 接続中のRoomインスタンス
let tokenTimer = null; // トークン期限切れ警告用タイマー

// === DOM要素 ===
const joinButton = document.getElementById('join-button');
const leaveButton = document.getElementById('leave-button');
const muteToggleButton = document.getElementById('mute-toggle-button');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const alertMessage = document.getElementById('alert-message');

// === ユーティリティ関数 ===

/**
 * サーバーレス機能からSkyway Auth Tokenを取得する
 * @returns {Promise<string>} トークン文字列
 */
async function fetchAuthToken() {
    try {
        // Netlify Functionsのエンドポイントを呼び出す
        const response = await fetch('/.netlify/functions/token');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error('Failed to fetch Skyway Auth Token:', error);
        alert('トークン取得中にエラーが発生しました。コンソールを確認してください。');
        return null;
    }
}

/**
 * 要件: トークン期限切れ警告タイマーの設定
 * 接続成功後、55分経過したら警告メッセージを表示します。
 */
function startTokenWarningTimer() {
    const delayMilliseconds = WARNING_TRIGGER_SECONDS * 1000;

    // 既にタイマーがあればクリア
    if (tokenTimer) clearTimeout(tokenTimer);

    tokenTimer = setTimeout(() => {
        const message = '⚠️ **トークンの有効期限がまもなく切れます。通話を終了してください。** (再接続機能はありません)';
        alertMessage.textContent = message;
        alertMessage.style.display = 'block';
        console.warn(message);
    }, delayMilliseconds);

    console.log(`トークン警告タイマーが設定されました: ${WARNING_TRIGGER_SECONDS}秒後に警告を表示します。`);
}

/**
 * トークン期限切れ警告タイマーの停止
 */
function stopTokenWarningTimer() {
    if (tokenTimer) {
        clearTimeout(tokenTimer);
        tokenTimer = null;
    }
    alertMessage.style.display = 'none';
}

/**
 * 要件: カメラとマイクの有無にかかわらず接続を試みる (フォールバックロジック)
 * @returns {Promise<MediaStream>} 取得できたメディアストリーム (または空のストリーム)
 */
async function getMediaStream() {
    let stream = null;
    try {
        // カメラとマイクの両方を試みる
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        console.log('カメラとマイクの取得に成功しました。');
    } catch (e) {
        console.warn('カメラまたはマイクの取得に失敗しました。利用可能なメディアのみを共有します。', e);
        try {
            // カメラがダメでもマイクのみを試みる
            stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            console.log('マイクのみの取得に成功しました。');
        } catch (e2) {
            console.warn('マイクの取得にも失敗しました。', e2);
            try {
                // マイクがダメでもカメラのみを試みる
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                console.log('カメラのみの取得に成功しました。');
            } catch (e3) {
                console.error('メディアストリームの取得に完全に失敗しました。空のストリームで接続します。', e3);
                // 完全に失敗した場合、空のストリームを作成して接続を試みる
                stream = new MediaStream();
            }
        }
    }
    
    // 取得したストリームをローカルビデオ要素に設定
    localVideo.srcObject = stream;
    return stream;
}

// === イベントハンドラ ===

/**
 * 「入室」ボタンのクリック処理
 */
joinButton.onclick = async () => {
    // 1. ボタン制御
    joinButton.disabled = true;

    // 2. メディアストリームの取得 (フォールバック含む)
    localStream = await getMediaStream();
    if (!localStream) {
        joinButton.disabled = false;
        return; 
    }

    // 3. Skyway Auth Tokenの取得
    const authToken = await fetchAuthToken();
    if (!authToken) {
        joinButton.disabled = false;
        return;
    }

    // 4. Skyway Peerの初期化
    try {
        // App IDはトークンに含まれているため、ここでは必要ありません。
        skywayPeer = new SkyWay.Peer({});
    } catch (e) {
        console.error('Skyway Peerの初期化に失敗しました。', e);
        localStream.getTracks().forEach(track => track.stop());
        joinButton.disabled = false;
        return;
    }

    // 5. Peerオープンイベント
    skywayPeer.on('open', async () => {
        console.log('Peerがオープンしました。');

        // 6. ルームへの接続
        localRoom = await skywayPeer.join(ROOM_NAME, {
            stream: localStream,
            token: authToken, // 取得したトークンを使用
        });

        // 7. Roomイベントリスナーの設定
        localRoom.on('stream', async ({ stream, subscriptionId }) => {
            // 他のピアからのストリームを受信したとき
            console.log('リモートストリームを受信しました。', subscriptionId);
            remoteVideo.srcObject = stream;
        });

        localRoom.on('members', ({ members }) => {
            // メンバーリストが更新されたとき
            console.log('現在のルームメンバー数:', members.length);
        });

        localRoom.on('memberJoined', ({ member }) => {
            console.log(`${member.id}が入室しました。`);
        });

        localRoom.on('memberLeft', ({ member }) => {
            console.log(`${member.id}が退出しました。`);
            // 相手が退出したら、リモートビデオをリセット
            remoteVideo.srcObject = null;
        });

        localRoom.on('close', () => {
            // ルームがクローズされたとき
            console.log('ルームがクローズされました。');
            handleLeave(); // 退出処理を呼び出す
            alert('ルーム接続が切断されました。');
        });

        // 8. 接続成功後のUI制御
        leaveButton.disabled = false;
        muteToggleButton.disabled = false;
        muteToggleButton.textContent = 'ミュート'; // 初期状態はミュートではない
        
        // 9. 要件: トークン期限切れ警告タイマーの開始
        startTokenWarningTimer();
    });

    skywayPeer.on('error', (err) => {
        console.error('Skyway Peerエラー:', err);
        alert(`Peerエラーが発生しました: ${err.name}`);
        handleLeave(); // エラー発生時も退出処理
    });
};

/**
 * 「退出」ボタンのクリック処理
 */
leaveButton.onclick = () => {
    handleLeave();
};

/**
 * 退出処理の共通ロジック
 */
function handleLeave() {
    // 1. ルームから退出
    if (localRoom) {
        localRoom.close();
        localRoom = null;
    }
    
    // 2. Peerのクローズ
    if (skywayPeer) {
        skywayPeer.close();
        skywayPeer = null;
    }

    // 3. ローカルメディアの解放
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    // 4. ビデオ要素のソースをリセット
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;

    // 5. UI制御
    joinButton.disabled = false;
    leaveButton.disabled = true;
    muteToggleButton.disabled = true;
    muteToggleButton.textContent = 'ミュート';
    
    // 6. トークン警告タイマーの停止
    stopTokenWarningTimer();

    console.log('ルームから正常に退出しました。');
}

/**
 * 「ミュート/ミュート解除」ボタンのクリック処理
 */
muteToggleButton.onclick = () => {
    if (!localStream) return;

    // オーディオトラックを取得
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) {
        alert('ミュートを切り替えるオーディオトラックがありません。');
        return;
    }

    // 最初のオーディオトラックの有効/無効を切り替える
    const isMuted = audioTracks[0].enabled;
    audioTracks.forEach(track => track.enabled = !isMuted);

    // UIの更新
    if (isMuted) {
        muteToggleButton.textContent = 'ミュート';
        console.log('ミュートを解除しました。');
    } else {
        muteToggleButton.textContent = 'ミュート解除';
        console.log('ミュートにしました。');
    }
};

// === 初期化 ===
// 起動時にボタンの状態を初期化
leaveButton.disabled = true;
muteToggleButton.disabled = true;
muteToggleButton.textContent = 'ミュート';
