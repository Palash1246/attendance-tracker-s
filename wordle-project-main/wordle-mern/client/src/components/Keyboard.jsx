const keyboardLayout = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["Enter","Z","X","C","V","B","N","M","←"]
];

export default function Keyboard({ onKeyClick, keyStates }) {
  return (
    <div className="keyboard">
      {keyboardLayout.map((row, i) => (
        <div key={i} className="key-row">
          {row.map((key) => (
            <button
              key={key}
              onClick={() => onKeyClick(key)}
              className={keyStates[key] || ""}
            >
              {key}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
