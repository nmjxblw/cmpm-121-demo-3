import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Coin, Board, CellInfo, Cell } from "./board.ts";

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
const myCellInfo: Map<string, CellInfo> = getMyCellInfo();
myBoard.getCellBounds(myBoard.getCellForPoint(MERRILL_CLASSROOM));

const playerCoins: Coin[] = getPlayerCoins();
const optionStrings: string[] = [
  "east",
  "west",
  "north",
  "south",
  "sensor",
  "reset",
];

const playerMarker = leaflet.marker(getPlayerPos());
let playerPos: leaflet.LatLng = playerMarker.getLatLng();
const playerPath: leaflet.LatLng[] = [];
let playerPathPolyline: leaflet.Polyline | null = null;

//button listener setting
optionStrings.forEach((opstring) => {
  document.querySelector(`#${opstring}`)!.addEventListener("click", () => {
    switch (opstring) {
      case "sensor":
        sensorClick();
        break;
      case "reset":
        resetClick();
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
  updatePlayerPath();
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

/**
 * to enable sensor
 */
function sensorClick(): void {
  navigator.geolocation.watchPosition((position) => {
    playerMarker.setLatLng(
      leaflet.latLng(position.coords.latitude, position.coords.longitude),
    );
    map.setView(playerMarker.getLatLng());
  });
}

/**
 * Clear all cache and reload the page
 */
function resetClick(): void {
  localStorage.clear();
  myCellInfo.clear();
  playerPos = MERRILL_CLASSROOM;
  playerCoins.length = 0;
  playerPath.length = 0;
  location.reload();
}

/**
 * Display player path
 */
function updatePlayerPath(): void {
  if (playerPathPolyline) {
    playerPathPolyline.removeFrom(map);
  }
  playerPathPolyline = leaflet
    .polyline(playerPath, {
      color: "red",
      weight: 2,
    })
    .addTo(map);
}
/**
 * Get myCellInfo if localStorage contain item "myCellInfo"
 */
function getMyCellInfo(): Map<string, CellInfo> {
  const storedData = localStorage.getItem("myCellInfo");

  if (storedData) {
    const dataEntries: [string, string][] = JSON.parse(storedData);
    return new Map<string, CellInfo>(
      dataEntries.map(([key, cellInfoJsonString]) => {
        const keySplit: string[] = key.split(":");
        const keyX: number = parseFloat(keySplit[0]);
        const keyY: number = parseFloat(keySplit[1]);
        const tempCell: Cell = { x: keyX, y: keyY };
        return [
          key,
          new CellInfo(tempCell).deserializeCell(cellInfoJsonString),
        ];
      }),
    );
  }
  return new Map<string, CellInfo>();
}

function getPlayerCoins(): Coin[] {
  if (localStorage.getItem("playerCoins") === null) {
    return [];
  }
  return JSON.parse(localStorage.getItem("playerCoins")!);
}

function getPlayerPos(): leaflet.LatLng {
  if (localStorage.getItem("playerPos") == null) {
    return MERRILL_CLASSROOM;
  }
  return JSON.parse(localStorage.getItem("playerPos")!) as leaflet.LatLng;
}

playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
updateStatusPanel();

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
}
statusPanel.addEventListener("playerCoinChanges", updateStatusPanel);
function updateStatusPanel() {
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
}
updatePits(playerPos);
window.addEventListener("beforeunload", autoSave);
function autoSave() {
  localStorage.setItem(
    "myCellInfo",
    JSON.stringify(
      Array.from(myCellInfo.entries(), ([key, value]) => [
        key,
        value.getCellJsonString(),
      ]),
    ),
  );
  localStorage.setItem("playerCoins", JSON.stringify(playerCoins));
  localStorage.setItem("playerPos", JSON.stringify(playerPos));
}
