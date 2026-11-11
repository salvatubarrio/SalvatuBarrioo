import type { ReactNode } from "react";
import type { ZoneId } from "@/game/content";

export function ZoneArt({ id }: { id: ZoneId }) {
  if (id === "colegio") return <School />;
  if (id === "plaza") return <Plaza />;
  if (id === "casas") return <Houses />;
  if (id === "hospital") return <Hospital />;
  if (id === "parroquia") return <Church />;
  return <Creek />;
}

export function CardArt({ id }: { id: string }) {
  if (id === "desague") return <Drain />;
  if (id === "bomba") return <Pump />;
  if (id === "arboles") return <Trees />;
  if (id === "jardin") return <Garden />;
  if (id === "vecinos") return <Neighbors />;
  if (id === "simulacro") return <Drill />;
  if (id === "evacua") return <Evac />;
  if (id === "rescate") return <Rescue />;
  return <Storm />;
}

export function CenterMark() {
  return (
    <svg className="pix center-mark" viewBox="0 0 64 40" aria-hidden="true">
      <rect width="64" height="40" fill="#2f8a44" />
      <rect y="16" width="64" height="8" fill="#cbb892" />
      <rect x="28" width="8" height="40" fill="#cbb892" />
      <rect x="2" y="2" width="12" height="8" fill="#1d6338" />
      <rect x="4" y="0" width="8" height="4" fill="#217a3a" />
      <rect x="5" y="6" width="2" height="6" fill="#6b4428" />
      <rect x="50" y="2" width="12" height="8" fill="#217a3a" />
      <rect x="52" width="8" height="4" fill="#2f9a4a" />
      <rect x="22" y="4" width="20" height="10" fill="#8d8474" />
      <rect x="24" y="6" width="16" height="6" fill="#2f86d0" />
      <rect x="26" y="7" width="6" height="2" fill="#d9f4ff" />
      <rect x="30" y="2" width="4" height="4" fill="#e7f7ff" />
      <rect x="4" y="28" width="10" height="8" fill="#e25b45" />
      <rect x="5" y="26" width="8" height="3" fill="#c44738" />
      <rect x="6" y="30" width="3" height="3" fill="#7ec8ea" />
      <rect x="7" y="34" width="4" height="2" fill="#6b3e26" />
      <rect x="50" y="28" width="10" height="8" fill="#f7f1e4" />
      <rect x="51" y="26" width="8" height="3" fill="#3d7ec4" />
      <rect x="52" y="30" width="3" height="3" fill="#ffe27a" />
      <rect x="40" y="30" width="6" height="7" fill="#f7f1e4" />
      <rect x="41" y="28" width="4" height="3" fill="#8a5a3a" />
      <rect x="42" y="32" width="2" height="3" fill="#ffd23f" />
      <rect x="18" y="30" width="3" height="3" fill="#ff5a4e" />
      <rect x="22" y="32" width="3" height="3" fill="#ffd23f" />
    </svg>
  );
}

function School() {
  return (
    <svg className="pix" viewBox="0 0 64 46" aria-hidden="true">
      <rect width="64" height="46" fill="#d7c49a" />
      <rect y="36" width="64" height="10" fill="#3e9a48" />
      <rect x="26" y="36" width="12" height="10" fill="#cbb892" />
      <rect x="2" y="6" width="2" height="30" fill="#5c3a22" />
      <rect x="4" y="6" width="12" height="4" fill="#7ec8ea" />
      <rect x="4" y="10" width="12" height="4" fill="#f7f1e4" />
      <rect x="8" y="10" width="4" height="4" fill="#e2a317" />
      <rect x="18" y="16" width="38" height="22" fill="#1a120c" />
      <rect x="20" y="20" width="34" height="16" fill="#f7f1e4" />
      <rect x="18" y="12" width="38" height="6" fill="#c44738" />
      <rect x="20" y="8" width="34" height="4" fill="#e25b45" />
      <rect x="22" y="4" width="4" height="8" fill="#6b3a32" />
      <rect x="40" y="2" width="10" height="8" fill="#1a120c" />
      <rect x="41" y="3" width="8" height="6" fill="#f7f1e4" />
      <rect x="41" y="3" width="8" height="2" fill="#e25b45" />
      <rect x="44" y="5" width="3" height="3" fill="#ffd23f" />
      <rect x="23" y="22" width="8" height="6" fill="#1a120c" />
      <rect x="24" y="23" width="6" height="4" fill="#7ec8ea" />
      <rect x="25" y="24" width="2" height="2" fill="#fff" />
      <rect x="45" y="22" width="8" height="6" fill="#1a120c" />
      <rect x="46" y="23" width="6" height="4" fill="#7ec8ea" />
      <rect x="47" y="24" width="2" height="2" fill="#fff" />
      <rect x="33" y="24" width="8" height="12" fill="#6b3e26" />
      <rect x="39" y="29" width="2" height="2" fill="#ffd23f" />
      <rect x="31" y="34" width="12" height="3" fill="#8d8474" />
    </svg>
  );
}

function Plaza() {
  return (
    <svg className="pix" viewBox="0 0 64 46" aria-hidden="true">
      <rect width="64" height="46" fill="#8dce6a" />
      <rect x="26" width="12" height="46" fill="#cbb892" />
      <rect y="18" width="64" height="10" fill="#cbb892" />
      <rect x="22" y="16" width="20" height="14" fill="#6a5a48" />
      <rect x="24" y="18" width="16" height="10" fill="#2f86d0" />
      <rect x="26" y="20" width="12" height="6" fill="#9fd4ee" />
      <rect x="29" y="21" width="4" height="2" fill="#fff" />
      <rect x="30" y="8" width="4" height="10" fill="#d9f4ff" />
      <rect x="28" y="6" width="8" height="3" fill="#f7f1e4" />
      <TreeBlock x={0} y={0} />
      <TreeBlock x={49} y={0} />
      <TreeBlock x={0} y={31} />
      <TreeBlock x={49} y={31} />
      <rect x="4" y="20" width="14" height="3" fill="#6b4428" />
      <rect x="4" y="18" width="2" height="7" fill="#5c3a22" />
      <rect x="16" y="18" width="2" height="7" fill="#5c3a22" />
      <rect x="44" y="34" width="14" height="3" fill="#6b4428" />
      <rect x="44" y="32" width="2" height="7" fill="#5c3a22" />
      <rect x="8" y="12" width="4" height="4" fill="#e25b45" />
      <rect x="14" y="13" width="4" height="4" fill="#ffd23f" />
      <rect x="46" y="12" width="4" height="4" fill="#ff5a4e" />
      <rect x="52" y="14" width="4" height="4" fill="#e2a317" />
    </svg>
  );
}

function TreeBlock({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x + 5} y={y + 8} width="3" height="6" fill="#6b4428" />
      <rect x={x} y={y + 3} width="13" height="7" fill="#1d6338" />
      <rect x={x + 2} y={y} width="9" height="5" fill="#2f9a4a" />
    </g>
  );
}

function Houses() {
  return (
    <svg className="pix" viewBox="0 0 64 46" aria-hidden="true">
      <rect width="64" height="46" fill="#8ec6ea" />
      <rect x="4" y="3" width="14" height="5" fill="#f7f1e4" />
      <rect x="46" y="5" width="12" height="4" fill="#e7f4fb" />
      <rect y="34" width="64" height="12" fill="#8d8474" />
      <rect y="34" width="64" height="2" fill="#6a5a48" />
      <rect x="2" y="42" width="8" height="2" fill="#1a120c" />
      <rect x="16" y="42" width="8" height="2" fill="#1a120c" />
      <rect x="30" y="42" width="8" height="2" fill="#1a120c" />
      <rect x="44" y="42" width="8" height="2" fill="#1a120c" />
      <rect x="56" y="42" width="6" height="2" fill="#1a120c" />
      <Cottage x={1} roof="#e25b45" wall="#fff6e8" door="#6b3e26" />
      <Cottage x={22} roof="#3d7ec4" wall="#f3d7b0" door="#1d6338" />
      <Cottage x={43} roof="#e2a317" wall="#f7f1e4" door="#5c3318" />
    </svg>
  );
}

function Cottage({ x, roof, wall, door }: { x: number; roof: string; wall: string; door: string }) {
  return (
    <g>
      <rect x={x + 8} y={6} width="3" height="6" fill="#5c3a22" />
      <rect x={x + 7} y={4} width="5" height="2" fill="#6b3a32" />
      <rect x={x + 6} y={10} width="8" height="3" fill={roof} />
      <rect x={x + 3} y={13} width="14" height="3" fill={roof} />
      <rect x={x + 1} y={16} width="18" height="3" fill={roof} />
      <rect x={x + 2} y={19} width="16" height="15" fill="#1a120c" />
      <rect x={x + 3} y={20} width="14" height="14" fill={wall} />
      <rect x={x + 4} y={22} width="5" height="4" fill="#1a120c" />
      <rect x={x + 5} y={23} width="3" height="2" fill="#7ec8ea" />
      <rect x={x + 11} y={22} width="5" height="4" fill="#1a120c" />
      <rect x={x + 12} y={23} width="3" height="2" fill="#ffe27a" />
      <rect x={x + 7} y={27} width="6" height="7" fill={door} />
      <rect x={x + 11} y={30} width="1" height="2" fill="#ffd23f" />
    </g>
  );
}

function Hospital() {
  return (
    <svg className="pix" viewBox="0 0 64 46" aria-hidden="true">
      <rect width="64" height="46" fill="#d7e2ea" />
      <rect y="36" width="64" height="10" fill="#8d8474" />
      <rect y="36" width="64" height="2" fill="#6a5a48" />
      <rect x="18" y="8" width="38" height="28" fill="#1a120c" />
      <rect x="20" y="14" width="34" height="20" fill="#f7f1e4" />
      <rect x="20" y="8" width="34" height="6" fill="#d4534a" />
      <rect x="33" y="16" width="6" height="12" fill="#ff5a4e" />
      <rect x="27" y="19" width="18" height="6" fill="#ff5a4e" />
      <rect x="35" y="18" width="2" height="8" fill="#fff" />
      <rect x="29" y="21" width="14" height="2" fill="#fff" />
      <rect x="22" y="26" width="6" height="5" fill="#1a120c" />
      <rect x="23" y="27" width="4" height="3" fill="#7ec8ea" />
      <rect x="44" y="26" width="6" height="5" fill="#1a120c" />
      <rect x="45" y="27" width="4" height="3" fill="#7ec8ea" />
      <rect x="30" y="28" width="10" height="6" fill="#3d7ec4" />
      <rect x="32" y="29" width="2" height="4" fill="#d9f4ff" />
      <rect x="36" y="29" width="2" height="4" fill="#d9f4ff" />
      <rect x="1" y="24" width="15" height="10" fill="#f7f1e4" />
      <rect x="1" y="24" width="15" height="3" fill="#d4534a" />
      <rect x="3" y="28" width="5" height="4" fill="#ff5a4e" />
      <rect x="5" y="28" width="1" height="4" fill="#fff" />
      <rect x="3" y="29" width="5" height="1" fill="#fff" />
      <rect x="11" y="28" width="4" height="3" fill="#7ec8ea" />
      <rect x="2" y="33" width="4" height="4" fill="#1a120c" />
      <rect x="10" y="33" width="4" height="4" fill="#1a120c" />
      <rect x="3" y="34" width="2" height="2" fill="#8d8474" />
      <rect x="11" y="34" width="2" height="2" fill="#8d8474" />
    </svg>
  );
}

function Church() {
  return (
    <svg className="pix" viewBox="0 0 64 46" aria-hidden="true">
      <rect width="64" height="46" fill="#d7c49a" />
      <rect y="36" width="64" height="10" fill="#3e9a48" />
      <rect x="26" y="36" width="12" height="10" fill="#cbb892" />
      <rect x="12" y="16" width="40" height="20" fill="#1a120c" />
      <rect x="14" y="20" width="36" height="16" fill="#f7f1e4" />
      <rect x="16" y="14" width="32" height="4" fill="#6b4428" />
      <rect x="20" y="12" width="24" height="3" fill="#8a5a3a" />
      <rect x="27" y="6" width="10" height="8" fill="#f7f1e4" />
      <rect x="27" y="6" width="10" height="2" fill="#8a5a3a" />
      <rect x="30" y="8" width="4" height="4" fill="#7ec8ea" />
      <rect x="30" y="0" width="4" height="7" fill="#1a120c" />
      <rect x="26" y="3" width="12" height="3" fill="#1a120c" />
      <rect x="17" y="22" width="8" height="8" fill="#1a120c" />
      <rect x="18" y="23" width="6" height="6" fill="#3d7ec4" />
      <rect x="20" y="23" width="2" height="6" fill="#ffd23f" />
      <rect x="18" y="25" width="6" height="2" fill="#e25b45" />
      <rect x="39" y="22" width="8" height="8" fill="#1a120c" />
      <rect x="40" y="23" width="6" height="6" fill="#3d7ec4" />
      <rect x="42" y="23" width="2" height="6" fill="#ffd23f" />
      <rect x="40" y="25" width="6" height="2" fill="#2f9a4a" />
      <rect x="28" y="26" width="8" height="10" fill="#6b3e26" />
      <rect x="33" y="30" width="2" height="2" fill="#ffd23f" />
      <rect x="3" y="24" width="4" height="12" fill="#1d6338" />
      <rect x="2" y="18" width="6" height="8" fill="#217a3a" />
      <rect x="57" y="24" width="4" height="12" fill="#1d6338" />
      <rect x="56" y="18" width="6" height="8" fill="#2f9a4a" />
    </svg>
  );
}

function Creek() {
  return (
    <svg className="pix" viewBox="0 0 160 32" aria-hidden="true">
      <rect width="160" height="32" fill="#8dce6a" />
      <rect y="8" width="160" height="4" fill="#a97858" />
      <rect y="22" width="160" height="4" fill="#a97858" />
      <rect y="12" width="160" height="10" fill="#1a66b0" />
      <rect y="12" width="160" height="3" fill="#8fd8ff" />
      <rect x="14" y="17" width="18" height="2" fill="#d9f4ff" />
      <rect x="118" y="18" width="16" height="2" fill="#d9f4ff" />
      <rect x="6" y="1" width="3" height="8" fill="#217a3a" />
      <rect x="12" y="0" width="3" height="9" fill="#1d6338" />
      <rect x="146" y="1" width="3" height="8" fill="#2f9a4a" />
      <rect x="22" y="24" width="3" height="8" fill="#1d6338" />
      <rect x="134" y="24" width="3" height="8" fill="#217a3a" />
      <rect x="46" y="16" width="8" height="3" fill="#ffd23f" />
      <rect x="52" y="15" width="4" height="2" fill="#e2a317" />
      <rect x="56" y="16" width="2" height="2" fill="#e25b45" />
      <rect x="64" y="6" width="34" height="6" fill="#6b4428" />
      <rect x="66" y="4" width="30" height="3" fill="#cbb892" />
      <rect x="64" y="2" width="3" height="10" fill="#5c3a22" />
      <rect x="95" y="2" width="3" height="10" fill="#5c3a22" />
      <rect x="70" y="12" width="4" height="8" fill="#5c3318" />
      <rect x="80" y="12" width="4" height="8" fill="#5c3318" />
      <rect x="90" y="12" width="4" height="8" fill="#5c3318" />
    </svg>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg className="pix card-pix" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" fill="#efe6cf" />
      {children}
    </svg>
  );
}

function Drain() {
  return (
    <Frame>
      <rect y="22" width="32" height="10" fill="#8d8474" />
      <rect x="6" y="18" width="20" height="8" fill="#4a5560" />
      <rect x="8" y="20" width="16" height="2" fill="#1a120c" />
      <rect x="8" y="23" width="16" height="1" fill="#1a120c" />
      <rect x="10" y="8" width="4" height="8" fill="#7ec8ea" />
      <rect x="18" y="6" width="4" height="10" fill="#2f86d0" />
      <rect x="14" y="4" width="4" height="2" fill="#8fd8ff" />
    </Frame>
  );
}

function Pump() {
  return (
    <Frame>
      <rect x="6" y="16" width="16" height="12" fill="#3d7ec4" />
      <rect x="8" y="18" width="12" height="4" fill="#d9f4ff" />
      <rect x="20" y="10" width="6" height="10" fill="#6b4428" />
      <rect x="18" y="8" width="10" height="3" fill="#e25b45" />
      <rect x="4" y="22" width="8" height="3" fill="#2f86d0" />
      <rect x="2" y="20" width="4" height="2" fill="#8fd8ff" />
      <rect x="10" y="8" width="3" height="8" fill="#8d8474" />
    </Frame>
  );
}

function Trees() {
  return (
    <Frame>
      <rect y="26" width="32" height="6" fill="#3e9a48" />
      <rect x="8" y="16" width="3" height="12" fill="#6b4428" />
      <rect x="20" y="18" width="3" height="10" fill="#6b4428" />
      <rect x="3" y="8" width="14" height="10" fill="#217a3a" />
      <rect x="6" y="4" width="8" height="6" fill="#2f9a4a" />
      <rect x="16" y="10" width="12" height="9" fill="#1d6338" />
      <rect x="18" y="7" width="7" height="5" fill="#2f9a4a" />
    </Frame>
  );
}

function Garden() {
  return (
    <Frame>
      <rect y="14" width="32" height="18" fill="#6a5340" />
      <rect x="4" y="16" width="24" height="10" fill="#3e9a48" />
      <rect x="6" y="18" width="20" height="6" fill="#217a3a" />
      <rect x="8" y="10" width="3" height="8" fill="#e25b45" />
      <rect x="7" y="8" width="5" height="3" fill="#ff5a4e" />
      <rect x="15" y="8" width="3" height="10" fill="#ffd23f" />
      <rect x="14" y="6" width="5" height="3" fill="#e2a317" />
      <rect x="22" y="11" width="3" height="7" fill="#7ec8ea" />
      <rect x="21" y="9" width="5" height="3" fill="#d9f4ff" />
    </Frame>
  );
}

function Neighbors() {
  return (
    <Frame>
      <rect y="26" width="32" height="6" fill="#8d8474" />
      <Person x={4} shirt="#3d7ec4" />
      <Person x={18} shirt="#e25b45" />
    </Frame>
  );
}

function Person({ x, shirt }: { x: number; shirt: string }) {
  return (
    <g>
      <rect x={x + 3} y={6} width="6" height="6" fill="#f0c9a0" />
      <rect x={x + 3} y={4} width="6" height="3" fill="#1a120c" />
      <rect x={x + 2} y={12} width="8" height="8" fill={shirt} />
      <rect x={x + 3} y={20} width="2" height="6" fill="#243044" />
      <rect x={x + 7} y={20} width="2" height="6" fill="#243044" />
    </g>
  );
}

function Drill() {
  return (
    <Frame>
      <rect x="6" y="4" width="16" height="20" fill="#f7f1e4" />
      <rect x="6" y="4" width="16" height="4" fill="#e2a317" />
      <rect x="9" y="11" width="10" height="2" fill="#1a120c" />
      <rect x="9" y="15" width="8" height="2" fill="#1a120c" />
      <rect x="9" y="19" width="6" height="2" fill="#3e9a48" />
      <rect x="22" y="14" width="6" height="8" fill="#d4534a" />
      <rect x="24" y="8" width="2" height="8" fill="#ffd23f" />
      <rect x="22" y="6" width="6" height="3" fill="#ffd23f" />
    </Frame>
  );
}

function Evac() {
  return (
    <Frame>
      <rect y="22" width="32" height="10" fill="#8d8474" />
      <rect x="4" y="16" width="24" height="4" fill="#3e9a48" />
      <rect x="18" y="6" width="8" height="3" fill="#ffd23f" />
      <rect x="22" y="4" width="3" height="12" fill="#ffd23f" />
      <rect x="16" y="8" width="6" height="3" fill="#ffd23f" />
      <Person x={4} shirt="#3dba6a" />
    </Frame>
  );
}

function Rescue() {
  return (
    <Frame>
      <rect y="18" width="32" height="14" fill="#2f86d0" />
      <rect y="18" width="32" height="2" fill="#8fd8ff" />
      <rect x="6" y="14" width="18" height="6" fill="#e25b45" />
      <rect x="8" y="16" width="14" height="2" fill="#f7f1e4" />
      <rect x="14" y="8" width="2" height="6" fill="#1a120c" />
      <rect x="10" y="8" width="8" height="3" fill="#ff5a4e" />
      <rect x="22" y="12" width="5" height="4" fill="#f0c9a0" />
    </Frame>
  );
}

function Storm() {
  return (
    <svg className="pix card-pix" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" fill="#142033" />
      <rect x="4" y="6" width="22" height="8" fill="#d5dde4" />
      <rect x="8" y="4" width="12" height="4" fill="#f7f1e4" />
      <rect x="6" y="12" width="16" height="4" fill="#8ea0b4" />
      <rect x="14" y="14" width="4" height="4" fill="#ffd23f" />
      <rect x="12" y="18" width="4" height="4" fill="#ffd23f" />
      <rect x="16" y="18" width="3" height="6" fill="#ffe98a" />
      <rect x="2" y="24" width="28" height="4" fill="#1f6fbe" />
      <rect x="4" y="24" width="6" height="2" fill="#8fd8ff" />
      <rect x="16" y="26" width="5" height="1" fill="#8fd8ff" />
    </svg>
  );
}
