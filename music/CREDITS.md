# 배경 음악 출처 (크레딧)

광장 마을과 포털 게임의 배경 음악은 모두 **CC0 1.0(공공 영역)** 곡입니다.
CC0은 만든 사람이 저작권을 내려놓은 것이라 **돈을 내지 않고, 허락을 따로 받지 않고, 출처를 적지 않아도** 학교 게임에 쓸 수 있습니다(상업용·수정도 가능).
그래도 고마운 마음으로 아래에 출처를 적어 둡니다. 모두 2026-11-19에 OpenGameArt.org의 각 곡 페이지에서 라이선스를 확인하고 받았습니다.

| 쓰는 곳 | 파일 | 곡 제목 | 만든 사람 | 받은 곳 | 라이선스 |
|---|---|---|---|---|---|
| 광장 마을 | `plaza` | Apple Cider | Zane Little Music | https://opengameart.org/content/apple-cider | CC0 |
| 광장 · 나의 집 안 | `home` | Chillin' Poupi (앨범 *Poupi's incredible adventures!*) | Komiku (Loyalty Freak Music) | https://opengameart.org/content/poupis-incredible-adventures-full-album | CC0 |
| 광장 · 별 모으기 놀이 | `stars` | Bicycle (같은 앨범) | Komiku | 위와 같음 | CC0 |
| 뚝딱 장터 3D (평화 주방·이야기) | `jangteo` | The weekly fair (같은 앨범) | Komiku | 위와 같음 | CC0 |
| 뚝딱 장터 3D 모험 · 바닷속 주방 | `sea` | Surfing (같은 앨범) | Komiku | 위와 같음 | CC0 |
| 뚝딱 장터 3D 모험 · 하늘 주방 | `sky` | Sky Blue Street | MintoDog | https://opengameart.org/content/sky-blue-street | CC0 |
| 뚝딱 장터 3D 모험 · 우주 주방 | `space` | Time to go to space now !! (같은 앨범) | Komiku | https://opengameart.org/content/poupis-incredible-adventures-full-album | CC0 |
| 하트 특공대 · 첫 화면 | `heart_title` | Title Screen (*Retro Game Music Pack*) | Juhani Junkala | https://opengameart.org/content/5-chiptunes-action | CC0 |
| 하트 특공대 · 마을 지키기 | `heart` | Level 1 (같은 묶음) | Juhani Junkala | 위와 같음 | CC0 |
| 하트 특공대 · 보스 | `heart_boss` | Level 3 (같은 묶음) | Juhani Junkala | 위와 같음 | CC0 |
| 사랑둥이 대모험 · 마을(하트·솜사탕·연필) | `sarang_town` | Time for the walk of the day (Poupi 앨범) | Komiku | https://opengameart.org/content/poupis-incredible-adventures-full-album | CC0 |
| 사랑둥이 대모험 · 들판·숲 | `sarang_field` | Flowerbed Fields [Loop] | Zane Little Music | https://opengameart.org/content/flowerbed-fields-loop | CC0 |
| 사랑둥이 대모험 · 심술 마을·거울 미로 | `sarang_mystery` | Treasure finding (Poupi 앨범) | Komiku | https://opengameart.org/content/poupis-incredible-adventures-full-album | CC0 |
| 사랑둥이 대모험 · 보스 | `sarang_boss` | Level 2 (*Retro Game Music Pack*) | Juhani Junkala | https://opengameart.org/content/5-chiptunes-action | CC0 |
| 사랑둥이 대모험 · 축하·미니게임 | `sarang_happy` | Ending (같은 묶음) | Juhani Junkala | 위와 같음 | CC0 |
| 꿈빛 성 탐정단 (1·2층) | `castle` | 8-Bit Curious Theme | emanresU | https://opengameart.org/content/8-bit-curious-theme | CC0 |
| 꿈빛 성 탐정단 (3층·다락방) | `castle2` | Intensive puzzle resolution (Poupi 앨범) | Komiku | https://opengameart.org/content/poupis-incredible-adventures-full-album | CC0 |

- CC0 전문: https://creativecommons.org/publicdomain/zero/1.0/deed.ko
- Juhani Junkala 묶음 안의 안내문(INFO.txt)에도 "CC0 creative commons license. You can do anything you want with these tunes."라고 적혀 있습니다.

## 어떻게 바꿨나
- 원곡을 그대로 쓰되, 게임에서 끊김 없이 돌아가게 **반복 구간(루프)** 만 골랐습니다. Apple Cider는 곡 안에서 똑같이 되풀이되는 30.65초~117.05초(86.4초)를 잘랐고, 나머지는 원래 반복용으로 만든 곡이라 통째로 씁니다.
- 낡은 패드와 학교 와이파이를 위해 **모노 약 60kbps**로 줄이고 곡마다 소리 크기를 맞췄습니다(-19 LUFS).
- `.ogg`(크롬·갤럭시탭) + `.mp3`(사파리용 예비). 다시 만들기: `python tools/make_music.py`

## 곡을 바꾸거나 더하려면
1. OpenGameArt.org 등에서 라이선스가 **CC0**인 곡을 고른다(CC-BY는 게임 화면에 출처를 꼭 띄워야 해서 피함. CC-BY-SA·GPL·"비상업용만"은 쓰지 않음).
2. `tools/make_music.py`의 `TRACKS`에 한 줄 더하고 실행 → `music.js`의 곡 목록이 저절로 바뀜.
3. 이 표에 한 줄 더한다.
