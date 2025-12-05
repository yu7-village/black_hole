// script.js

let localStream = null;
let room = null;
let peer = null;
const ROOM_NAME = 'black_hole';

const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const joinButton = document.getElementById('join-button');
const leaveButton = document.getElementById('leave-button');
const muteButton = document.getElementById('mute-toggle-button');
const alertMessage = document.getElementById('alert-message');

// --- ユーティリティ関数 ---

function showAlert(message) {
    alertMessage.textContent = message;
    alertMessage.style.display = 'block';
    setTimeout(() => {
        alertMessage.style.display = 'none';
    }, 5000);
}

// Netlify Functionsから認証トークンを取得する
async function fetchAuthToken() {
    try {
        const response = await fetch('/.netlify/functions/token');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error('Failed to fetch Skyway Auth Token:', error);
        showAlert(`Failed to fetch Skyway Auth Token: ${error.message}`);
        throw error;
    }
}

// カメラとマイクのストリームを取得
async function getMediaStream() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = stream;
        localStream = stream;
        console.log('カメラとマイクの取得に成功しました。');
        return stream;
    } catch (error) {
        console.error('メディアの取得に失敗しました:', error);
        showAlert('カメラとマイクの取得に失敗しました。ページをリロードして再試行してください。');
        throw error;
    }
}

// --- Skyway V3 接続ロジック ---

async function joinRoom() {
    try {
        // 1. メディアストリームの取得
        const stream = await getMediaStream();
        
        // 2. 認証トークンの取得
        const token = await fetchAuthToken();
        
        // 3. Skyway Peerの初期化 (v3 SDK)
        peer = await SkyWay.RoomClient.createInstance({
            token: token,
        });

        // 4. Roomへの参加
        room = await peer.join({
            name: ROOM_NAME,
            type: 'sfu',
        });
        console.log(`ルーム ${ROOM_NAME} に参加しました。`);
        showAlert(`ルーム ${ROOM_NAME} に参加しました。`);

        // 5. ローカルストリームの公開
        const publication = await room.publish(stream);
        console.log('ローカルストリームを公開しました。');
        
        // 6. イベントリスナーの設定
        
        // 参加者がストリームを公開したときのイベント
        room.onStreamPublished.add(async (e) => {
            if (e.publication.publisher.id === peer.localPerson.id) return;

            console.log('リモートストリームを受信しました。');
            
            // ストリームを購読 (Subscribe)
            const { stream: remoteMediaStream } = await room.subscribe(e.publication.id);
            
            remoteVideo.srcObject = remoteMediaStream;
            remoteVideo.play();
        });

        // 参加者がルームから退出したときのイベント
        room.onMemberLeft.add((e) => {
            console.log(`メンバー ${e.member.id} が退出しました。`);
            remoteVideo.srcObject = null;
            showAlert(`メンバーが退出しました。`);
        });

        // UIの更新
        joinButton.disabled = true;
        leaveButton.disabled = false;
        muteButton.disabled = false;

    } catch (error) {
        console.error('Skyway接続に失敗しました:', error);
        showAlert(`接続エラー: ${error.message}`);
        // 致命的なエラーの場合、peerを解放
        if(peer) peer.dispose();
    }
}

async function leaveRoom() {
    if (room) {
        await room.dispose();
        room = null;
        console.log('ルームを退出しました。');
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    
    // UIの更新
    joinButton.disabled = false;
    leaveButton.disabled = true;
    muteButton.disabled = true;
    showAlert('ルームを退出しました。');
}

function toggleMute() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            const isMuted = !audioTrack.enabled;
            audioTrack.enabled = isMuted;
            muteButton.textContent = isMuted ? 'ミュート解除' : 'ミュート';
        }
    }
}

// --- イベントリスナー ---

joinButton.onclick = joinRoom;
leaveButton.onclick = leaveRoom;
muteButton.onclick = toggleMute;
