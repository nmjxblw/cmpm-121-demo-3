import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Coin, Board, CellInfo } from "./board.ts";

const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const PIT_SPAWN_PROBABILITY = 0.1;
const pits: leaflet.Layer[] = [];
const mapContainer = document.querySelector<HTMLElement>("#map")!;

const map = leaflet.map(mapContainer, {
  center: MERRILL_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const myBoard: Board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
const myCellInfo: Map<string, CellInfo> = new Map<string, CellInfo>();
myBoard.getCellBounds(myBoard.getCellForPoint(MERRILL_CLASSROOM));

const playerCoins: Coin[] = [];
const optionStrings: string[] = [
  "east",
  "west",
  "north",
  "south",
  "sensor",
  "reset",
];

//button listener setting
optionStrings.forEach((opstring) => {
  document.querySelector(`#${opstring}`)!.addEventListener("click", () => {
    switch (opstring) {
      case "sensor":
        break;
      case "reset":
        break;
      default:
        playerMove(opstring);
    }
  });
});

/**
 * move the player marker and update nearby pits
 * @param dir the direction the player is moving
 * @returns
 */
function playerMove(dir: string) {
  switch (dir) {
    case "east":
      playerPos.lng += TILE_DEGREES;
      break;
    case "west":
      playerPos.lng -= TILE_DEGREES;
      break;
    case "north":
      playerPos.lat += TILE_DEGREES;
      break;
    case "south":
      playerPos.lat -= TILE_DEGREES;
      break;
    default:
      return;
  }
  playerMarker.setLatLng(playerPos);
  map.setView(playerPos);
  updatePits(playerPos);

  playerPath.push(Object.assign({}, playerPos));
  // updatePlayerPath();
}

/**
 * remove all pits and create new pits from current position
 * @param playerPos the player's current position
 */
function updatePits(playerPos: leaflet.LatLng): void {
  removeAllPits();
  myBoard.getCellsNearPoint(playerPos).forEach((cell) => {
    if (luck([cell.x, cell.y].toString()) < PIT_SPAWN_PROBABILITY) {
      makePit(cell.x, cell.y);
    }
  });
}

/**
 * the function will remove all pits from the map.
 */
function removeAllPits(): void {
  pits.forEach((pit) => {
    pit.removeFrom(map);
  });
  pits.length = 0;
}

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
const playerPos: leaflet.LatLng = playerMarker.getLatLng();
const playerPath: leaflet.LatLng[] = [];
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";

/**
 * the function will create a pit at the given coordinates.
 * @param {number} lat latitude
 * @param {number} lng longitude
 */

function makePit(lat: number, lng: number) {
  const bounds = myBoard.getCellBounds({
    x: lat,
    y: lng,
  });
  const cell = myBoard.getCellForPoint(new leaflet.LatLng(lat, lng));
  const pit = leaflet.rectangle(bounds) as leaflet.Layer;
  const key: string = cell.x.toString() + ":" + cell.y.toString();
  if (!myCellInfo.get(key)) {
    myCellInfo.set(key, new CellInfo(cell));
    let value = Math.floor(luck([lat, lng, "initialValue"].toString()) * 100);
    for (let iter = 0; iter < value; iter++) {
      myCellInfo.get(key)!.addCoin();
    }
  }

  pit.bindPopup(() => {
    const container = document.createElement("div");
    function updateContext() {
      let context: string;
      let cellCoinStrings: string[] | undefined = myCellInfo
        .get(key)!
        .getCoinsDisplay();
      context = `<div>There is a pit here at "${lat.toFixed(4)},${lng.toFixed(
        4,
      )}". It has value <span id="value">${
        myCellInfo.get(key)!.coins.length
      }</span>.
    </div><p>Coins:</p>
    <div id="scrollableContainer">`;
      for (let iter = 0; iter < myCellInfo.get(key)!.coins.length; iter++) {
        if (cellCoinStrings) {
          context += `<p>${cellCoinStrings[iter]} <button id="poke">poke</button></p>`;
        }
      }
      context += `</div><button id="deposite">deposit</button>`;
      container.innerHTML = context;
    }
    updateContext();
    const pokes = container.querySelectorAll<HTMLButtonElement>("#poke")!;
    pokes.forEach((poke, index) => {
      poke.addEventListener("click", () => {
        if (myCellInfo.get(key)!.coins.length <= 0) return;
        const newCoin: Coin = myCellInfo.get(key)!.removeCoin(index)!;
        playerCoins.push(newCoin);
        container.dispatchEvent(new Event("playerCoinChanges"));
        statusPanel.dispatchEvent(new Event("playerCoinChanges"));
        updateContext();
      });
    });

    const deposite = container.querySelector<HTMLButtonElement>("#deposite")!;
    deposite.addEventListener("click", () => {
      if (playerCoins.length <= 0) return;
      myCellInfo.get(key)!.addCoin(playerCoins.pop()!);
      container.dispatchEvent(new Event("playerCoinChanges"));
      statusPanel.dispatchEvent(new Event("playerCoinChanges"));
      updateContext();
    });
    container.addEventListener("playerCoinChanges", () => {
      container.querySelector<HTMLSpanElement>("#value")!.innerHTML = myCellInfo
        .get(key)!
        .coins.length.toString();
    });
    return container;
  });
  pit.addTo(map);
  pits.push(pit);
  // console.log(myCellInfo.get(key)!.getCellJsonString());
}
statusPanel.addEventListener("playerCoinChanges", () => {
  let context: string =
    playerCoins.length > 0
      ? `${playerCoins.length} points accumulated`
      : "No points yet...";
  if (playerCoins.length > 0) {
    context += `</div><p>Coins:</p>
    <div id="scrollableContainer">`;
    for (let iter = 0; iter < playerCoins.length; iter++) {
      context += `<p>${
        playerCoins[iter].cell.x.toString() +
        ":" +
        playerCoins[iter].cell.y.toString() +
        "#" +
        playerCoins[iter].serial.toString()
      }</p>`;
    }
    context += `</div>`;
  }
  statusPanel.innerHTML = context;
});
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (
      luck(
        [
          MERRILL_CLASSROOM.lat + i * TILE_DEGREES,
          MERRILL_CLASSROOM.lng + j * TILE_DEGREES,
        ].toString(),
      ) < PIT_SPAWN_PROBABILITY
    ) {
      makePit(
        MERRILL_CLASSROOM.lat + i * TILE_DEGREES,
        MERRILL_CLASSROOM.lng + j * TILE_DEGREES,
      );
    }
  }
}
