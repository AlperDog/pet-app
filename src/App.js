import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const AVATARS = [
  { key: "dog", emoji: "🐶" },
  { key: "cat", emoji: "🐱" },
  { key: "bird", emoji: "🐦" },
  { key: "turtle", emoji: "🐢" },
];
const EVOLVED = {
  dog: "🦄", // fun evolved emoji for demo
  cat: "🦁",
  bird: "🦜",
  turtle: "🐉",
};

const DEFAULT_STATS = {
  hunger: 100,
  energy: 100,
  happiness: 100,
  evolved: false,
  avatar: "dog",
};

const STAT_DECREASE_INTERVAL = 10000; // 10 seconds
const STAT_DECREASE_AMOUNT = 4;
const STAT_MAX = 100;
const STAT_MIN = 0;
const EVOLUTION_TIME = 60000; // 1 minute
const RANDOM_EVENT_INTERVAL = 30000; // 30 seconds
const EASTER_EGG_WINDOW = 60000; // 60 seconds

function clamp(val) {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, val));
}

const randomEvents = [
  { msg: "Your pet found a toy!", stat: "happiness", delta: 5 },
  { msg: "Your pet fell asleep for a bit.", stat: "energy", delta: 5 },
  { msg: "Your pet is looking for attention.", stat: "happiness", delta: 5 },
  { msg: "Your pet found a snack!", stat: "hunger", delta: 5 },
  { msg: "Your pet took a quick nap.", stat: "energy", delta: 3 },
];

function App() {
  // State for pet name, avatar, and stats
  const [petName, setPetName] = useState("");
  const [avatar, setAvatar] = useState("dog");
  const [showWelcome, setShowWelcome] = useState(false);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [petAnim, setPetAnim] = useState("");
  const [toast, setToast] = useState({ show: false, msg: "" });
  const [showEvolve, setShowEvolve] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const intervalRef = useRef();
  const randomEventRef = useRef();
  const evolutionTimer = useRef();
  const evolutionEligible = useRef(false);
  const evolutionStart = useRef(null);
  const easterEggSeq = useRef([]);
  const easterEggTimer = useRef(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem("petName");
    const savedStats = localStorage.getItem("petStats");
    const savedAvatar = localStorage.getItem("petAvatar");
    if (savedName) setPetName(savedName);
    else setShowWelcome(true);
    if (savedStats) setStats(JSON.parse(savedStats));
    if (savedAvatar) setAvatar(savedAvatar);
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    if (petName) localStorage.setItem("petName", petName);
  }, [petName]);
  useEffect(() => {
    localStorage.setItem("petStats", JSON.stringify(stats));
  }, [stats]);
  useEffect(() => {
    if (avatar) localStorage.setItem("petAvatar", avatar);
  }, [avatar]);

  // Timed stat decrease
  useEffect(() => {
    if (showWelcome) return;
    intervalRef.current = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        hunger: clamp(prev.hunger - STAT_DECREASE_AMOUNT),
        energy: clamp(prev.energy - STAT_DECREASE_AMOUNT),
        happiness: clamp(prev.happiness - STAT_DECREASE_AMOUNT),
      }));
    }, STAT_DECREASE_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [showWelcome]);

  // Random events
  useEffect(() => {
    if (showWelcome) return;
    randomEventRef.current = setInterval(() => {
      const event =
        randomEvents[Math.floor(Math.random() * randomEvents.length)];
      setStats((prev) => ({
        ...prev,
        [event.stat]: clamp(prev[event.stat] + event.delta),
      }));
      showToast(event.msg);
    }, RANDOM_EVENT_INTERVAL);
    return () => clearInterval(randomEventRef.current);
  }, [showWelcome]);

  // Evolution logic
  useEffect(() => {
    if (stats.evolved || showWelcome) return;
    const allHigh =
      stats.hunger > 80 && stats.energy > 80 && stats.happiness > 80;
    if (allHigh) {
      if (!evolutionEligible.current) {
        evolutionEligible.current = true;
        evolutionStart.current = Date.now();
        evolutionTimer.current = setTimeout(() => {
          setStats((prev) => ({ ...prev, evolved: true }));
          setShowEvolve(true);
        }, EVOLUTION_TIME);
      }
    } else {
      evolutionEligible.current = false;
      evolutionStart.current = null;
      clearTimeout(evolutionTimer.current);
    }
    return () => clearTimeout(evolutionTimer.current);
  }, [stats, showWelcome]);

  // Easter egg logic
  function recordEasterEgg(action) {
    const now = Date.now();
    if (!easterEggTimer.current) {
      easterEggSeq.current = [];
      easterEggTimer.current = setTimeout(() => {
        easterEggSeq.current = [];
        easterEggTimer.current = null;
      }, EASTER_EGG_WINDOW);
    }
    easterEggSeq.current.push({ action, time: now });
    // Check for sequence: feed, feed, feed, play, sleep
    const seq = easterEggSeq.current.map((e) => e.action).join(",");
    if (seq.endsWith("feed,feed,feed,play,sleep")) {
      setShowEasterEgg(true);
      setShowConfetti(true);
      setStats((prev) => ({
        ...prev,
        hunger: clamp(prev.hunger + 10),
        energy: clamp(prev.energy + 10),
        happiness: clamp(prev.happiness + 10),
      }));
      setTimeout(() => setShowConfetti(false), 3500);
      easterEggSeq.current = [];
      clearTimeout(easterEggTimer.current);
      easterEggTimer.current = null;
    }
  }

  // Handle name submit
  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (petName.trim()) {
      setShowWelcome(false);
      setStats((prev) => ({ ...prev, avatar }));
    }
  };

  // Avatar selection
  const handleAvatarSelect = (key) => setAvatar(key);

  // Button handlers
  const handleFeed = () => {
    if (stats.hunger >= STAT_MAX) return;
    setStats((prev) => ({ ...prev, hunger: clamp(prev.hunger + 18) }));
    triggerAnim("bounce");
    showToast("Your pet loved the food!");
    recordEasterEgg("feed");
  };
  const handleSleep = () => {
    if (stats.energy >= STAT_MAX) return;
    setStats((prev) => ({ ...prev, energy: clamp(prev.energy + 18) }));
    triggerAnim("sleep");
    showToast("Your pet had a nice nap!");
    recordEasterEgg("sleep");
  };
  const handlePlay = () => {
    if (stats.happiness >= STAT_MAX) return;
    setStats((prev) => ({ ...prev, happiness: clamp(prev.happiness + 18) }));
    triggerAnim("wiggle");
    showToast("Your pet had fun playing!");
    recordEasterEgg("play");
  };

  // Animation logic
  function triggerAnim(type) {
    setPetAnim(type);
    setTimeout(() => setPetAnim(""), 700);
  }

  // Toast logic
  function showToast(msg) {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), 1800);
  }

  // Pet visual state
  const isSad =
    stats.hunger === 0 || stats.energy === 0 || stats.happiness === 0;
  const isHappy =
    stats.hunger > 80 && stats.energy > 80 && stats.happiness > 80;

  // Pet emoji style
  let petStyle = {
    fontSize: "6rem",
    filter: isSad ? "grayscale(1)" : "none",
    transition: "filter 0.3s",
  };
  if (isHappy) {
    petStyle.boxShadow = "0 0 32px 8px #aa00ff88";
    petStyle.borderRadius = "50%";
  }

  // Animation classes
  let animClass = "";
  if (petAnim === "bounce") animClass = "pet-bounce";
  if (petAnim === "sleep") animClass = "pet-sleep";
  if (petAnim === "wiggle") animClass = "pet-wiggle";

  // Evolved pet emoji
  const petEmoji = stats.evolved
    ? EVOLVED[avatar] || "🦄"
    : AVATARS.find((a) => a.key === avatar)?.emoji || "🐶";

  return (
    <div
      className="min-vh-100 d-flex flex-column justify-content-center align-items-center bg-dark text-light"
      style={{ background: "#121212" }}
    >
      <div className="position-relative w-100" style={{ maxWidth: 400 }}>
        {/* Settings Button (top-left) */}
        <button
          className="btn btn-sm btn-outline-light rounded-circle position-absolute d-flex align-items-center justify-content-center"
          title="Settings"
          onClick={() => setShowWelcome(true)}
          style={{
            left: 12,
            top: 12,
            width: 40,
            height: 40,
            fontSize: "1.3rem",
            background: "#222",
            border: "none",
            zIndex: 1100,
            padding: 0,
          }}
        >
          <span role="img" aria-label="settings" style={{ lineHeight: 1 }}>
            ⚙️
          </span>
        </button>
        {/* Info Button (top-right) */}
        <button
          className="btn btn-sm btn-outline-light rounded-circle position-absolute d-flex align-items-center justify-content-center"
          title="Rules & Info"
          onClick={() => setShowInfo(true)}
          style={{
            right: 12,
            top: 12,
            width: 40,
            height: 40,
            fontSize: "1.3rem",
            background: "#222",
            border: "none",
            zIndex: 1100,
            padding: 0,
          }}
        >
          <span role="img" aria-label="info" style={{ lineHeight: 1 }}>
            ℹ️
          </span>
        </button>
        {/* Welcome Modal */}
        {showWelcome && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{ background: "rgba(18,18,18,0.95)", zIndex: 1000 }}
          >
            <form
              className="bg-dark p-4 rounded shadow text-center"
              style={{ minWidth: 280 }}
              onSubmit={handleNameSubmit}
            >
              <h3 className="mb-3">Welcome!</h3>
              <p>Choose your pet:</p>
              <div className="d-flex justify-content-center mb-3 gap-3">
                {AVATARS.map((a) => (
                  <button
                    type="button"
                    key={a.key}
                    className={`btn btn-outline-light d-flex align-items-center justify-content-center p-0 ${
                      avatar === a.key ? "border-primary border-3" : ""
                    }`}
                    style={{
                      fontSize: "2.2rem",
                      background: avatar === a.key ? "#222" : "#333",
                      borderRadius: 16,
                      width: 56,
                      height: 56,
                      height: 56,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onClick={() => handleAvatarSelect(a.key)}
                  >
                    {a.emoji}
                  </button>
                ))}
              </div>
              <p>Name your pet:</p>
              <input
                className="form-control mb-3 text-center bg-secondary text-light border-0"
                type="text"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                maxLength={16}
                autoFocus
                required
              />
              <button className="btn btn-primary w-100" type="submit">
                Start Caring
              </button>
            </form>
          </div>
        )}
        {/* Toast Feedback */}
        {toast.show && (
          <div
            className="toast show position-fixed top-0 start-50 translate-middle-x mt-3"
            style={{
              zIndex: 2000,
              minWidth: 220,
              background: "#222",
              color: "#fff",
            }}
          >
            <div className="toast-body text-center">{toast.msg}</div>
          </div>
        )}
        {/* Evolution Modal */}
        {showEvolve && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{ background: "rgba(18,18,18,0.97)", zIndex: 3000 }}
          >
            <div
              className="bg-dark p-4 rounded shadow text-center"
              style={{ minWidth: 280 }}
            >
              <span style={{ fontSize: "5rem" }}>
                {EVOLVED[avatar] || "🦄"}
              </span>
              <h3 className="mt-3">Your pet evolved!</h3>
              <p>You're a great caretaker! 🎉</p>
              <button
                className="btn btn-primary mt-2"
                onClick={() => setShowEvolve(false)}
              >
                Yay!
              </button>
            </div>
          </div>
        )}
        {/* Easter Egg Modal */}
        {showEasterEgg && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{ background: "rgba(18,18,18,0.97)", zIndex: 3000 }}
          >
            <div
              className="bg-dark p-4 rounded shadow text-center"
              style={{ minWidth: 280 }}
            >
              <h3 className="mb-3">You discovered the secret ritual! 🐾</h3>
              <p>Permanent +10 boost to all stats!</p>
              <button
                className="btn btn-primary mt-2"
                onClick={() => setShowEasterEgg(false)}
              >
                Awesome!
              </button>
            </div>
          </div>
        )}
        {/* Confetti */}
        {showConfetti && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 pointer-events-none"
            style={{ zIndex: 4000 }}
          >
            <Confetti />
          </div>
        )}
        {/* Rules & Info Modal */}
        {showInfo && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{ background: "rgba(18,18,18,0.97)", zIndex: 3000 }}
          >
            <div
              className="bg-dark p-4 rounded shadow text-light"
              style={{ minWidth: 280, maxWidth: 340 }}
            >
              <h4 className="mb-3">🐾 Virtual Pet Rules & Info</h4>
              <ul className="text-start small mb-3" style={{ paddingLeft: 18 }}>
                <li>
                  Name and choose your pet on first visit (or via ⚙️ Settings).
                </li>
                <li>
                  Keep Hunger, Energy, and Happiness above 0 or your pet gets
                  sad.
                </li>
                <li>
                  Stats decrease every 10 seconds. Use Feed, Sleep, and Play to
                  boost them.
                </li>
                <li>Random events can boost stats every 30 seconds.</li>
                <li>
                  If all stats stay above 80 for 1 minute, your pet evolves!
                </li>
                <li>
                  Secret: Feed 3x, then Play, then Sleep (in 60s) for a special
                  reward.
                </li>
                <li>All progress is saved in your browser.</li>
              </ul>
              <button
                className="btn btn-primary w-100"
                onClick={() => setShowInfo(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
        {/* Pet Image/Emoji */}
        <div className="d-flex flex-column align-items-center my-4">
          <div
            style={{
              width: "10rem",
              height: "10rem",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              transition: "background 0.3s",
              overflow: "hidden",
            }}
          >
            <span
              className={animClass}
              style={{
                fontSize: "6rem",
                filter: isSad ? "grayscale(1)" : "none",
                transition: "filter 0.3s",
                boxShadow: isHappy ? "0 0 18px 6px #aa00ffcc" : "none",
                borderRadius: "50%",
              }}
            >
              {petEmoji}
            </span>
          </div>
          <h2 className="mt-3 mb-1 text-center">{petName || "Pet Name"}</h2>
        </div>
        {/* Status Bars */}
        <div className="mb-4">
          <div className="mb-2">
            <label>Hunger</label>
            <div className="progress bg-secondary" style={{ height: "1.5rem" }}>
              <div
                className="progress-bar bg-primary"
                style={{ width: `${stats.hunger}%` }}
              ></div>
            </div>
          </div>
          <div className="mb-2">
            <label>Energy</label>
            <div className="progress bg-secondary" style={{ height: "1.5rem" }}>
              <div
                className="progress-bar bg-success"
                style={{ width: `${stats.energy}%` }}
              ></div>
            </div>
          </div>
          <div className="mb-2">
            <label>Happiness</label>
            <div className="progress bg-secondary" style={{ height: "1.5rem" }}>
              <div
                className="progress-bar bg-warning"
                style={{ width: `${stats.happiness}%` }}
              ></div>
            </div>
          </div>
        </div>
        {/* Interaction Buttons */}
        <div className="d-flex justify-content-between mb-4">
          <button
            className="btn btn-lg btn-primary flex-fill mx-1"
            onClick={handleFeed}
            disabled={stats.hunger >= STAT_MAX}
          >
            🍖 Feed
          </button>
          <button
            className="btn btn-lg btn-info flex-fill mx-1"
            onClick={handleSleep}
            disabled={stats.energy >= STAT_MAX}
          >
            💤 Sleep
          </button>
          <button
            className="btn btn-lg btn-warning flex-fill mx-1"
            onClick={handlePlay}
            disabled={stats.happiness >= STAT_MAX}
          >
            🎾 Play
          </button>
        </div>
      </div>
      {/* Animations CSS */}
      <style>{`
        .pet-bounce { animation: bounce 0.7s; }
        .pet-sleep { animation: sleep 0.7s; }
        .pet-wiggle { animation: wiggle 0.7s; }
        @keyframes bounce {
          0% { transform: translateY(0); }
          30% { transform: translateY(-30px); }
          60% { transform: translateY(0); }
          80% { transform: translateY(-10px); }
          100% { transform: translateY(0); }
        }
        @keyframes sleep {
          0% { filter: blur(0); }
          50% { filter: blur(2px); }
          100% { filter: blur(0); }
        }
        @keyframes wiggle {
          0% { transform: rotate(0deg); }
          20% { transform: rotate(-15deg); }
          40% { transform: rotate(10deg); }
          60% { transform: rotate(-5deg); }
          80% { transform: rotate(5deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}

// Confetti component (simple SVG burst)
function Confetti() {
  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      {[...Array(60)].map((_, i) => {
        const angle = (i / 60) * 2 * Math.PI;
        const x = 50 + 40 * Math.cos(angle);
        const y = 50 + 40 * Math.sin(angle);
        const color = `hsl(${i * 6},90%,60%)`;
        return (
          <circle
            key={i}
            cx="50%"
            cy="50%"
            r={2 + (i % 3)}
            fill={color}
            style={{
              transform: `translate(${x - 50}vw, ${y - 50}vh) scale(1.2)`,
              opacity: 0.8,
              transition: "all 2s cubic-bezier(.17,.67,.83,.67)",
              animation: `confetti-burst 2.5s ${i * 0.02}s both`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-burst {
          0% { opacity: 1; r: 0; }
          80% { opacity: 1; }
          100% { opacity: 0; r: 0; }
        }
      `}</style>
    </svg>
  );
}

export default App;
