/* PeerJS 연결 서버 설정
 * 광장의 모둠 연결과 미니게임의 "친구랑 같이 하기"가 함께 써요.
 *
 * 비워 두면 PeerJS 무료 연결 서버(0.peerjs.com)를 써요.
 * 그 서버가 없어지거나 막히면, PeerJS 연결 서버(peerjs-server, 무료 공개 프로그램)를
 * 다른 곳에 세우고 아래처럼 주소만 적으면 돼요.
 *
 *   window.PEER_OPTS = { host: "내-서버-주소", port: 443, path: "/", secure: true };
 */
window.PEER_OPTS = window.PEER_OPTS || {};
