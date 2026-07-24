export default function Tile({ letter, status }) {
  return (
    <div className={`tile ${status || ""}`}>
      {letter}
    </div>
  );
}
