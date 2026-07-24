import Tile from "./Tile";

export default function Board({ rows }) {
  // rows is an array of { guess: string, result: string[] }
  return (
    <div className="board">
      {rows.map((row, i) => (
        <div key={i} className="row">
          {Array.from({ length: 5 }).map((_, j) => (
            <Tile
              key={j}
              letter={(row.guess[j] || "").toUpperCase()}
              status={row.result[j] || ""}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
