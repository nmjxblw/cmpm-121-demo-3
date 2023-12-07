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
    // return leaflet.latLngBounds([
    //   [cell.x, cell.y],
    //   [cell.x + this.tileWidth, cell.y + this.tileWidth],
    // ]);
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
        if (v == 0 && h == 0) continue;
        const cell = this.getCanonicalCell({
          x: originCell.x + h,
          y: originCell.y + v,
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
  coinsStrings: string[];
  stringizedCell: string;

  constructor(cell: Cell) {
    this.cell = cell;
    this.coins = [];
    this.coinsStrings = [];
    this.stringizedCell = ``;
  }

  addCoin(): void {
    this.coins.push({
      cell: this.cell,
      serial:
        this.coins.length > 0
          ? this.coins[this.coins.length - 1].serial + 1
          : 0,
    });
    this.coinsStrings.push(
      this.cell.x.toString() +
        ":" +
        this.cell.y.toString() +
        "#" +
        this.coins[this.coins.length - 1].serial.toString(),
    );
    this.stringizedCell = this.coinsStrings.join(" ");
  }

  getCellCoinStrings(): string[] {
    return (this.coinsStrings = this.coins.map(
      (coin) =>
        coin.cell.x.toString() +
        ":" +
        coin.cell.y.toString() +
        "#" +
        coin.serial.toString(),
    ));
  }
  getStringizedCell(): string {
    return (this.stringizedCell = this.getCellCoinStrings().join(" "));
  }
  deserializeCell(): void {
    this.coinsStrings = this.stringizedCell.split(" ");
    this.coins = this.coinsStrings.map((coinString) => {
      const [x, y, serial] = coinString.split(/[:#]/);
      return {
        cell: {
          x: parseFloat(x),
          y: parseFloat(y),
        },
        serial: parseInt(serial),
      };
    });
  }
}
