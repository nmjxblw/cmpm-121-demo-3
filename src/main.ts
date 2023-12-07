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

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
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
  const key: string = cell.x.toString() + ":" + cell.y.toString();

  myCellInfo.set(key, new CellInfo(cell));
  const pit = leaflet.rectangle(bounds) as leaflet.Layer;
  let value = Math.floor(luck([lat, lng, "initialValue"].toString()) * 100);
  for (let iter = 0; iter < value; iter++) {
    myCellInfo.get(key)!.addCoin();
  }

  pit.bindPopup(() => {
    const container = document.createElement("div");
    function updateContext() {
      let context: string;
      let cellCoinStrings: string[] | undefined = myCellInfo
        .get(key)!
        .getCoinsDisplay();
      context = `<div>There is a pit here at "${lat.toFixed(4)},${lng.toFixed(
        4
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
        console.log("index" + index);
        const newCoin: Coin = myCellInfo.get(key)!.removeCoin(index)!;
        console.log(
          "coin:" + JSON.stringify(newCoin.cell) + "#" + newCoin.serial
        );
        console.log(myCellInfo.get(key)!.coins.length);
        playerCoins.push(newCoin);
        container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          myCellInfo.get(key)!.coins.length.toString();
        statusPanel.innerHTML = `${playerCoins.length} points accumulated`;
        updateContext();
      });
    });

    const deposite = container.querySelector<HTMLButtonElement>("#deposite")!;
    deposite.addEventListener("click", () => {
      if (playerCoins.length <= 0) return;
      myCellInfo.get(key)!.addCoin(playerCoins.pop()!);
      container.querySelector<HTMLSpanElement>("#value")!.innerHTML = myCellInfo
        .get(key)!
        .coins.toString();
      statusPanel.innerHTML = `${playerCoins.length} points accumulated`;
      updateContext();
    });
    return container;
  });
  pit.addTo(map);
}
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (
      luck(
        [
          MERRILL_CLASSROOM.lat + i * TILE_DEGREES,
          MERRILL_CLASSROOM.lng + j * TILE_DEGREES,
        ].toString()
      ) < PIT_SPAWN_PROBABILITY
    ) {
      makePit(
        MERRILL_CLASSROOM.lat + i * TILE_DEGREES,
        MERRILL_CLASSROOM.lng + j * TILE_DEGREES
      );
    }
  }
}
