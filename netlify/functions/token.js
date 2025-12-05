// netlify/functions/token.js (最終修正版)
const { SkyWayAuthToken, uuidV4 } = require('@skyway-sdk/token');

// ... (環境変数、ROOM_NAMEの定義はそのまま) ...

exports.handler = async (event, context) => {
  // ... (環境変数チェックのロジックはそのまま) ...
  try {
    const token = new SkyWayAuthToken({
      jti: uuidV4(),
      ttl: 3600,
      iat: Math.floor(Date.now() / 1000),
      scope: {
        app: {
          id: SKYWAY_APP_ID,
          turn: true,
          rooms: [ // 💡 修正点: 'channels' から 'rooms' に変更
            {
              name: ROOM_NAME,
              actions: ['read', 'write'], 
              members: [
                {
                  id: '*',
                  name: '*',
                  actions: ['read', 'write'], 
                },
              ],
              sfuBots: [
                {
                  actions: ['read', 'write'],
                },
              ],
            },
          ],
        },
      },
    }).encode(SKYWAY_SECRET_KEY);

    // ... (トークン返却のロジックはそのまま) ...
  } catch (error) {
    // ... (エラー処理のロジックはそのまま) ...
  }
};