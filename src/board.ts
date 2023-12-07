import leaflet from "leaflet";

export interface Cell {
  readonly x: number;
  readonly y: number;
}
export interface Coin {
  readonly cell: Cell;
  readonly serial: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { x, y } = cell;
    const key = [x, y].toString();
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, cell);
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const step = 0.0001;
    let { lat, lng } = point;
    lat = Math.round(lat / step);
    lng = Math.round(lng / step);
    return this.getCanonicalCell({
      x: lat,
      y: lng,
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const { x, y } = cell;
    const CURRENT_POINT = leaflet.latLng({
      lat: x,
      lng: y,
    });
    return leaflet.latLngBounds([
      [CURRENT_POINT.lat, CURRENT_POINT.lng],
      [CURRENT_POINT.lat + this.tileWidth, CURRENT_POINT.lng + this.tileWidth],
    ]);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    for (let h = -1; h <= 1; h++) {
      for (let v = -1; v <= 1; v++) {
        const cell = this.getCanonicalCell({
          x: originCell.x + h * this.tileVisibilityRadius,
          y: originCell.y + v * this.tileVisibilityRadius,
        });
        resultCells.push(cell);
      }
    }

    return resultCells;
  }

  consoleKnownCells() {
    console.log(this.knownCells);
  }
}

export class CellInfo {
  cell: Cell;
  coins: Coin[];
  coinsDisplay: string[];
  coinsJsonString: string[];
  cellJsonString: string;

  constructor(cell: Cell) {
    this.cell = cell;
    this.coins = [];
    this.coinsDisplay = [];
    this.coinsJsonString = [];
    this.cellJsonString = ``;
  }

  addCoin(coin?: Coin): void {
    this.coins.push(
      coin
        ? coin
        : {
            cell: this.cell,
            serial:
              this.coins.length > 0
                ? this.coins[this.coins.length - 1].serial + 1
                : 0,
          }
    );
    this.getCoinsDisplay();
    this.cellJsonString = this.getCoinsToJsonString().join(" ");
  }
  removeCoin(index?: number): Coin | null {
    if (index == null) {
      return this.removeCoin(0);
    }
    if (index > this.coins.length - 1 || index < 0) {
      return null;
    }
    const result: Coin = this.coins.splice(index, 1)[0];
    this.getCellJsonString();
    return result;
  }

  deserializeCell(): void {
    this.coinsJsonString = this.cellJsonString.split(" ");
    this.getCoinsFromJsonString();
  }

  getCoinsToJsonString(): string[] {
    return (this.coinsJsonString = this.coins.map((coin) =>
      JSON.stringify(coin)
    ));
  }
  getCoinsFromJsonString(): Coin[] {
    return (this.coins = this.coinsJsonString.map((coinString) =>
      JSON.parse(coinString)
    ));
  }
  getCoinsDisplay() {
    return (this.coinsDisplay = this.coins.map(
      (coin) =>
        coin.cell.x.toString() +
        ":" +
        coin.cell.y.toString() +
        "#" +
        coin.serial.toString()
    ));
  }
  getCellJsonString(): string {
    return (this.cellJsonString = this.getCoinsToJsonString().join(" "));
  }
}
