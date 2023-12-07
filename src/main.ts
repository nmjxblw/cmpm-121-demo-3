import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board, CellInfo } from "./board.ts";

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

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

let points = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";

/**
 * the function will create a pit at the given coordinates.
 * @param {number} i latitude
 * @param {number} j longitude
 */

function makePit(i: number, j: number) {
  const bounds = myBoard.getCellBounds({
    x: MERRILL_CLASSROOM.lat + i,
    y: MERRILL_CLASSROOM.lng + j,
  });
  const cell = myBoard.getCellForPoint(
    new leaflet.LatLng(MERRILL_CLASSROOM.lat + i, MERRILL_CLASSROOM.lng + j),
  );
  const key: string = cell.x.toString() + ":" + cell.y.toString();

  myCellInfo.set(key, new CellInfo(cell));
  const pit = leaflet.rectangle(bounds) as leaflet.Layer;

  pit.bindPopup(() => {
    let value = Math.floor(luck([i, j, "initialValue"].toString()) * 100);
    for (let iter = 0; iter < value; iter++) {
      myCellInfo.get(key)!.addCoin();
    }
    const container = document.createElement("div");
    let context: string;
    let cellCoinStrings: string[] | undefined = myCellInfo
      .get(key)!
      .getCellCoinStrings();
    context = `<div>There is a pit here at "${i},${j}". It has value <span id="value">${value}</span>.
    </div><p>Coins:</p>
    <div id="scrollableContainer">`;
    for (let iter = 0; iter < value; iter++) {
      if (cellCoinStrings) {
        context += `<p>${cellCoinStrings[iter]} <button id="poke">poke</button></p>`;
      }
    }
    context += `</div><button id="deposite">deposit</button>`;
    container.innerHTML = context;

    const poke = container.querySelector<HTMLButtonElement>("#poke")!;
    poke.addEventListener("click", () => {
      if (value <= 0) return;
      value--;
      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        value.toString();
      points++;
      statusPanel.innerHTML = `${points} points accumulated`;
    });

    const deposite = container.querySelector<HTMLButtonElement>("#deposite")!;
    deposite.addEventListener("click", () => {
      if (points <= 0) return;
      value++;
      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        value.toString();
      points--;
      statusPanel.innerHTML = `${points} points accumulated`;
    });
    return container;
  });
  pit.addTo(map);
}
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (
      luck([i * TILE_DEGREES, j * TILE_DEGREES].toString()) <
      PIT_SPAWN_PROBABILITY
    ) {
      makePit(i * TILE_DEGREES, j * TILE_DEGREES);
    }
  }
}
myBoard.consoleKnownCells();
