/* 새 게임 4개(젤리와 팡·거인과 꼬마·자석 친구·피라미드 대탈출) ↔ 광장 보상 잇기 (2026-11-20)
 * 이 게임들은 광장을 모르고 만들어져서 자기 신호('uriban:game')만 보낸다. 이 파일이 그것을 광장 약속으로 바꾼다.
 * 선생님이 고른 규칙: "다른 게임과 똑같이"
 *   - 장을 깨면(chapter-clear) 선물 상자(gift.js 'plaza-gift', 장마다 하루 한 번, 한 게임 하루 3개)
 *   - 끝까지 깨면(game-clear) 반 별 +1(back.js 'minigame-clear', 둘이서 한 방은 방장 기기만) + 선물 상자(장 선물 개수와 상관없이)
 *   - 피라미드 상자에서 꾸미기를 얻으면(item) 광장 옷장에 같은(비슷한) 옷을 넣는다. 피라미드 동전은 게임 안에서만(이어 달리기)
 * 붙이는 곳: 캐릭터3D/pipeline/uriban_inject.py가 games/원본_<게임>.html 끝에 back.js와 이 파일을 붙여 games/<게임>.html을 만든다.
 * 게임이 쌓는 우편함(localStorage 'uriban-inbox')은 여기서 바로 처리했으니 비운다.
 */
(function () {
  "use strict";
  if (window.URIBAN_BRIDGE) return;
  window.URIBAN_BRIDGE = true;
  // 피라미드 꾸미기 14가지 → 광장 옷. 앞 7개는 광장에 원래 있던 비슷한 옷, 뒤 7개는 피라미드 전용으로 새로 만든 옷(items3d.js only:'pyramid')
  var PYR = {
    ribbon: "bow", flower: "flower_crown", glasses: "sunglasses", halo: "halo", backpack: "backpack_mint", cape: "cape_red", butterfly: "butterfly_wings",
    cat: "cat_ears", magic: "magician_hat", grad: "grad_cap", antenna: "star_antenna", egg: "egg_hat", nemes: "pharaoh_nemes", minikin: "kinball_hat",
  };
  var COOP = { jelly: 1, giant: 1, magnet: 1 };
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function jput(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  // 이 기기가 친구 방에 들어간 쪽(guest)인지: 게임마다 시험 손잡이(window.__v)에 들어 있다. 모르면 방장으로 본다
  function isGuest() {
    try {
      var v = window.__v;
      if (!v) return false;
      var a = typeof v.net === "function" ? v.net() : null;   // 젤리와 팡
      if (a && a.mode === "guest") return true;
      var b = typeof v.st === "function" ? v.st() : null;     // 거인과 꼬마(mode) · 자석 친구(net)
      return !!b && (b.mode === "guest" || b.net === "guest");
    } catch (e) { return false; }
  }
  function giveWear(id) {
    if (!id) return;
    var a = jget("plaza.items", []);
    if (!Array.isArray(a)) a = [];
    if (a.indexOf(id) < 0) { a.push(id); jput("plaza.items", a); }
  }
  window.addEventListener("uriban:game", function (e) {
    var d = (e && e.detail) || {}, g = String(d.game || "");
    if (!g) return;
    try {
      if (d.type === "chapter-clear") {
        window.dispatchEvent(new CustomEvent("plaza-gift", { detail: { game: g, place: "ch" + (d.chapter || 0) } }));
      } else if (d.type === "game-clear") {
        window.dispatchEvent(new CustomEvent("minigame-clear", { detail: { game: g, team: COOP[g] ? 2 : 1, guest: COOP[g] ? isGuest() : false, final: true } }));
      } else if (d.type === "item" && g === "pyramid" && d.item) {
        giveWear(PYR[d.item.id]);
      }
    } catch (er) {}
    if (/^(chapter-clear|game-clear|item|result)$/.test(d.type)) setTimeout(function () { try { localStorage.removeItem("uriban-inbox"); } catch (er) {} }, 0);
  });
  // 피라미드를 광장에서 바로 시작하면(?play) 처음 화면 단추를 안 눌러서 소리가 안 켜진다(검토) → 첫 터치 때 게임의 소리 단추를 대신 눌러 켠다.
  // 게임 소리를 꺼 둔 아이(저장 sound 0)는 그대로, 첫 터치가 소리 단추 자체면 그 아이가 누른 대로
  if (/[?&]play(=|&|$)/.test(location.search)) {
    var woke = false;
    var wake = function (e) {
      if (woke) return;
      woke = true;
      try {
        var b = document.getElementById("bSound"), sv = jget("uriban-run-v1", {}) || {};
        if (!b || sv.sound === 0 || (e && e.target && b.contains(e.target))) return;
        if (!window.UribanGame || UribanGame.id !== "pyramid") return;
        b.click();
      } catch (er) {}
    };
    ["pointerdown", "touchstart", "keydown"].forEach(function (k) { window.addEventListener(k, wake, { capture: true }); });
  }
  // 피라미드: 예전에 상자에서 얻었는데 광장 옷장에 없는 것도 맞춰 넣는다(게임 저장 uriban-run-v1)
  try {
    var sv = jget("uriban-run-v1", null), own = sv && sv.owned;   // owned = {꾸미기 id: 얻은 횟수}
    if (own && typeof own === "object") Object.keys(own).forEach(function (k) { if (own[k] > 0) giveWear(PYR[k]); });
  } catch (e) {}
})();
