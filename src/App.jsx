/* App.jsx — Shell with Firebase auth + screen routing */

import { useState, useEffect } from "react";
import { onAuthChange, doSignOut, firebaseReady } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { T, SANS } from "./shared";
import LandingPage from "./pages/LandingPage";
import Onboarding from "./Onboarding";
import Dashboard from "./Dashboard";
import Affiches from "./Affiches";
import Cours from "./Cours";
import Messages from "./Messages";

export default function App() {
  const [screen, setScreen] = useState(firebaseReady ? "loading" : "landing");
  const [user, setUser] = useState(null);
  const [profil, setProfil] = useState(null);

  useEffect(() => {
    if (!firebaseReady) return;
    return onAuthChange(async (u) => {
      if (!u) {
        setUser(null);
        setProfil(null);
        setScreen("landing");
        return;
      }
      setUser(u);
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists() && snap.data().onboardingComplete) {
          setProfil({ ...snap.data(), uid: u.uid });
          setScreen("dashboard");
        } else {
          setScreen("onboarding");
        }
      } catch (e) {
        console.warn("Firestore read failed:", e.message);
        setScreen("onboarding");
      }
    });
  }, []);

  const headerProps = {
    user,
    profil,
    onNavigate: (s) => {
      if (s === "profile") { setScreen("dashboard-profile"); return; }
      setScreen(s);
    },
    onSignOut: () => doSignOut(),
  };

  if (screen === "loading")
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: T.gold, fontSize: 18, fontFamily: SANS }}>Chargement...</div>
      </div>
    );

  if (screen === "landing")
    return <LandingPage />;

  if (screen === "onboarding")
    return (
      <Onboarding
        user={user}
        firebaseReady={firebaseReady}
        onComplete={(p) => {
          setProfil({ ...p, uid: user.uid });
          setScreen("dashboard");
        }}
      />
    );

  if (screen === "affiches")
    return <Affiches profil={profil} headerProps={headerProps} />;

  if (screen === "cours")
    return <Cours profil={profil} headerProps={headerProps} />;

  if (screen === "messages")
    return <Messages profil={profil} headerProps={headerProps} />;

  return (
    <Dashboard
      user={user}
      profil={profil}
      setProfil={setProfil}
      headerProps={headerProps}
      onNavigate={setScreen}
      onLogout={() => doSignOut()}
      showProfileModal={screen === "dashboard-profile"}
      onCloseProfile={() => setScreen("dashboard")}
    />
  );
}
