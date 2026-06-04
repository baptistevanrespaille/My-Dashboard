"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell, Clock, TrendingUp, Zap, Flame, Target,
  CheckCircle2, Circle, Trash2, Plus, X, ChevronRight,
  ArrowUp, ArrowDown, TrendingDown,
} from "lucide-react";
import {
  Line, XAxis, Tooltip, ResponsiveContainer,
  Area, AreaChart, CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Card3D from "@/components/Card3D";
import PulsingGlow from "@/components/PulsingGlow";
import FlipNumber from "@/components/FlipNumber";
import { useCountUp } from "@/hooks/useCountUp";
import { staggerContainer, SPRING_STANDARD, gradientDividerStyle } from "@/lib/motion";

// ─── Palette ──────────────────────────────────────────────────────────────────
const ACCENT  = "#00E5FF";
const GOLD    = "#C9A84C";
const SUCCESS = "#00E676";
const DANGER  = "#FF3D57";
const WARNING = "#FFB300";

// ─── Types ────────────────────────────────────────────────────────────────────
type WorkoutInfo = {
  type: string; sessionLabel: string | null;
  duration: number; exerciseCount: number;
  totalVolume: number; distanceKm: number | null;
};
type DashboardData = {
  todayWorkout: WorkoutInfo | null; lastWorkout: WorkoutInfo | null;
  weekSessions: number;
  latestWeight: { value: number; date: string; previousValue: number | null } | null;
  todayCalories: { calories: number } | null; avgCalories7d: number | null;
  lastSleep: { duration: number; quality: number; score: number | null } | null;
  totalPatrimoine: { value: number; change7d: number | null } | null;
  pendingTasks: { id: string; title: string; priority: string; scope: string }[];
  weightHistory: { date: string; value: number; ma: number }[];
};

const SESSION_COLORS: Record<string,string> = {
  PUSH:"#6495ED",PULL:SUCCESS,LEGS:WARNING,RUNNING:DANGER,CARDIO:DANGER,FULL_BODY:"#A78BFA",OTHER:"#64748B",
};
const SESSION_LABELS: Record<string,string> = {
  PUSH:"Push Day",PULL:"Pull Day",LEGS:"Leg Day",RUNNING:"Running",CARDIO:"Cardio",FULL_BODY:"Full Body",OTHER:"Autre",
};
const PRIORITY_STYLE: Record<string,{bg:string;text:string;label:string;indicator:string}> = {
  HIGH:   {bg:`${DANGER}18`,  text:DANGER,  label:"HAUTE",  indicator:DANGER},
  MEDIUM: {bg:`${WARNING}18`, text:WARNING, label:"MOY.",   indicator:WARNING},
  LOW:    {bg:"rgba(255,255,255,0.05)",text:"rgba(240,238,232,0.3)",label:"BASSE",indicator:"rgba(240,238,232,0.12)"},
};

function fmtEuro(n: number) {
  return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
}
function progressColor(pct: number) {
  return pct < 40 ? DANGER : pct < 80 ? WARNING : pct <= 100 ? ACCENT : GOLD;
}

// ─── Typewriter ────────────────────────────────────────────────────────────────
function TypewriterGreeting() {
  const greetingText = () => {
    const h = new Date().getHours();
    if (h >= 6 && h < 12) return "Bonjour Baptiste";
    if (h >= 12 && h < 18) return "Bon après-midi Baptiste";
    return "Bonsoir Baptiste";
  };
  const full = greetingText();
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(full.slice(0, i));
      if (i >= full.length) clearInterval(iv);
    }, 40);
    return () => clearInterval(iv);
  }, [full]);

  return (
    <p style={{ color: "rgba(240,238,232,0.5)", fontSize: 15, marginTop: 6, fontFamily: "var(--font-sans)" }}>
      {displayed}
      {displayed.length < full.length && (
        <span style={{ animation: "typewriterBlink 0.8s ease-in-out infinite" }}>|</span>
      )}
    </p>
  );
}

// ─── Avatar with rotating conic border ────────────────────────────────────────
function AvatarButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      style={{ position: "relative", width: 48, height: 48, borderRadius: "50%", background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}
    >
      <span aria-hidden style={{
        position:"absolute",inset:-2,borderRadius:"50%",
        background:`conic-gradient(${ACCENT}, ${GOLD}, ${ACCENT}, ${GOLD})`,
        animation:"rotateBorder 4s linear infinite",zIndex:0,
      }}/>
      <span style={{
        position:"absolute",inset:2,borderRadius:"50%",
        background:"var(--surface-2)",zIndex:1,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontFamily:"var(--font-display)",fontSize:22,color:ACCENT,
      }}>B</span>
    </motion.button>
  );
}

// ─── BeamProgress ─────────────────────────────────────────────────────────────
function BeamProgress({ value, max, color=ACCENT, height=4 }: {value:number;max:number;color?:string;height?:number}) {
  const [w, setW] = useState(0);
  const pct = max > 0 ? Math.min((value/max)*100, 100) : 0;
  useEffect(() => { const t = setTimeout(() => setW(pct), 150); return ()=>clearTimeout(t); }, [pct]);
  return (
    <div style={{ background:"var(--surface-3)",borderRadius:999,height,overflow:"hidden",position:"relative" }}>
      <div className="beam-progress" style={{
        height:"100%",borderRadius:999,width:`${w}%`,
        background:`linear-gradient(90deg, ${color}88, ${color})`,
        boxShadow:`0 0 8px ${color}50`,
        transition:"width 1.2s cubic-bezier(0.32,0.72,0,1)",
      }}/>
    </div>
  );
}

// ─── Gradient divider ─────────────────────────────────────────────────────────
function GradDiv({ color=ACCENT }: { color?: string }) {
  return <div style={gradientDividerStyle(color)} />;
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value as number;
  return (
    <div className="glass-card" style={{ borderRadius:12, padding:"10px 14px", minWidth:100 }}>
      <p style={{ color:"rgba(240,238,232,0.45)",fontSize:11,marginBottom:4 }}>{label}</p>
      <p style={{ fontFamily:"var(--font-mono)",fontSize:16,fontWeight:700,color:"var(--text-primary)" }}>{val} kg</p>
    </div>
  );
}

// ─── Add task sheet ────────────────────────────────────────────────────────────
function AddTaskSheet({ open, onClose, onAdd }: { open:boolean;onClose:()=>void;onAdd:(t:string,p:string)=>void }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), priority);
    setTitle(""); setPriority("MEDIUM"); onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)" }}
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}/>
          <motion.div className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
            style={{ background:"rgba(12,12,18,0.97)",borderRadius:"24px 24px 0 0",border:`1px solid ${ACCENT}18`,borderBottom:"none",backdropFilter:"blur(30px)",paddingBottom:"env(safe-area-inset-bottom)" }}
            initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}} transition={SPRING_STANDARD}>
            <div style={{ width:40,height:4,borderRadius:999,background:"rgba(240,238,232,0.15)",margin:"12px auto 0" }}/>
            <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontFamily:"var(--font-display)",fontSize:24,letterSpacing:"0.05em",color:"var(--text-primary)" }}>NOUVELLE TÂCHE</span>
              <motion.button whileTap={{scale:0.9}} onClick={onClose} style={{ color:"rgba(240,238,232,0.4)",background:"none",border:"none",cursor:"pointer",minWidth:44,minHeight:44 }}>
                <X size={18}/>
              </motion.button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding:"20px",display:"flex",flexDirection:"column",gap:14 }}>
              <div style={{ borderBottom:`1px solid ${ACCENT}35`,paddingBottom:8 }}>
                <input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Titre de la tâche…"
                  style={{ background:"none",border:"none",outline:"none",color:"var(--text-primary)",fontSize:16,width:"100%",fontFamily:"var(--font-sans)" }}/>
              </div>
              <div style={{ display:"flex",gap:8 }}>
                {(["HIGH","MEDIUM","LOW"] as const).map(p => {
                  const s = PRIORITY_STYLE[p];
                  return (
                    <motion.button key={p} type="button" whileTap={{scale:0.95}} onClick={()=>setPriority(p)} style={{
                      flex:1,padding:"10px 4px",borderRadius:10,fontSize:10,fontWeight:700,letterSpacing:"0.08em",
                      background:priority===p ? s.bg : "var(--surface-3)",color:priority===p ? s.text : "rgba(240,238,232,0.3)",
                      border:`1px solid ${priority===p ? s.indicator+"50" : "rgba(255,255,255,0.05)"}`,
                      cursor:"pointer",fontFamily:"var(--font-sans)",minHeight:44,
                      transition:"all 0.18s cubic-bezier(0.32,0.72,0,1)",
                    }}>{s.label}</motion.button>
                  );
                })}
              </div>
              <motion.button type="submit" whileTap={{scale:0.97}} className="shimmer-btn" style={{
                background:`linear-gradient(135deg, ${ACCENT}, #00B8CC)`,color:"#050508",borderRadius:14,height:50,
                fontWeight:700,fontSize:13,letterSpacing:"0.08em",border:"none",cursor:"pointer",fontFamily:"var(--font-sans)",
                boxShadow:`0 4px 24px ${ACCENT}30`,
              }}>
                AJOUTER
              </motion.button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div style={{ padding:"60px 20px 0",display:"flex",flexDirection:"column",gap:20 }}>
      <div className="flex justify-between">
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          <div className="skeleton" style={{ height:12,width:80 }}/>
          <div className="skeleton" style={{ height:52,width:200 }}/>
          <div className="skeleton" style={{ height:15,width:160 }}/>
        </div>
        <div className="skeleton" style={{ width:48,height:48,borderRadius:"50%" }}/>
      </div>
      <div className="skeleton" style={{ height:220,borderRadius:20 }}/>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
        {[...Array(4)].map((_,i)=><div key={i} className="skeleton" style={{ height:110,borderRadius:20 }}/>)}
      </div>
      <div className="skeleton" style={{ height:160,borderRadius:20 }}/>
      <div className="skeleton" style={{ height:200,borderRadius:20 }}/>
      <div className="skeleton" style={{ height:200,borderRadius:20 }}/>
    </div>
  );
}

// ─── CountUp stat ─────────────────────────────────────────────────────────────
function CountStat({ value, unit, decimals=0 }: { value:number|null;unit?:string;decimals?:number }) {
  const str = useCountUp({ to: value ?? 0, decimals, enabled: value != null });
  if (value == null) return <span style={{ opacity:0.3 }}>—</span>;
  return (
    <>
      <span style={{ fontFamily:"var(--font-display)",letterSpacing:"0.02em" }}>{str}</span>
      {unit && <span style={{ fontSize:"0.45em",color:"rgba(240,238,232,0.4)",marginLeft:4,letterSpacing:"0.05em" }}>{unit}</span>}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardHome() {
  const [data, setData] = useState<DashboardData|null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<{id:string;title:string;priority:string;scope:string}[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [calorieGoal, setCalorieGoal] = useState(2500);
  const [sportsGoal, setSportsGoal] = useState(5);
  const [weightGoal, setWeightGoal] = useState<number|null>(null);
  const router = useRouter();

  useEffect(()=>{
    setCalorieGoal(parseInt(localStorage.getItem("calorie_goal")??"2500"));
    setSportsGoal(parseInt(localStorage.getItem("sports_goal_week")??"5"));
    const wg = localStorage.getItem("weight_goal_kg");
    if (wg) setWeightGoal(parseFloat(wg));
    fetch("/api/dashboard/home").then(r=>r.json()).then(d=>{setData(d);setTasks(d.pendingTasks??[]);})
      .catch(()=>toast.error("Erreur de chargement")).finally(()=>setLoading(false));
  },[]);

  async function handleToggleTask(id:string) {
    const newSet = new Set(completedIds);
    const wasCompleted = newSet.has(id);
    if (!wasCompleted) newSet.add(id); else newSet.delete(id);
    setCompletedIds(newSet);
    await fetch(`/api/tasks/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({completed:!wasCompleted})});
    if (!wasCompleted && Array.from(newSet).length===tasks.length) toast.success("Toutes les tâches complétées 🎉");
  }
  async function handleDeleteTask(id:string) {
    setTasks(prev=>prev.filter(t=>t.id!==id));
    await fetch(`/api/tasks/${id}`,{method:"DELETE"});
  }
  async function handleAddTask(title:string, priority:string) {
    const res = await fetch("/api/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,priority,scope:"DAY",dueDate:new Date().toISOString().split("T")[0]})});
    if (res.ok) {
      const task = await res.json();
      setTasks(prev=>[...prev,{id:task.id,title:task.title,priority:task.priority,scope:task.scope}]);
      toast.success("Tâche ajoutée !");
    }
  }

  if (loading) return <DashboardSkeleton/>;

  const dateLabel = format(new Date(),"EEEE d MMMM",{locale:fr}).toUpperCase();
  const workout = data?.todayWorkout ?? data?.lastWorkout;
  const sessionColor = workout?.sessionLabel ? SESSION_COLORS[workout.sessionLabel] : ACCENT;
  const sessionName  = workout?.sessionLabel ? SESSION_LABELS[workout.sessionLabel] : "SESSION";
  const visibleTasks = tasks.filter(t=>!completedIds.has(t.id)).slice(0,4);
  const sportPct = sportsGoal > 0 ? (data?.weekSessions??0)/sportsGoal*100 : 0;
  const sportColor = progressColor(sportPct);
  const calPct = calorieGoal>0 && data?.avgCalories7d ? data.avgCalories7d/calorieGoal*100 : 0;
  const calColor = progressColor(calPct);
  const weightDiff = data?.latestWeight?.previousValue != null ? data.latestWeight!.value - data.latestWeight!.previousValue! : null;
  const sleepScore = data?.lastSleep?.score ?? null;
  const sleepColor = sleepScore==null ? "rgba(240,238,232,0.3)" : sleepScore>=80 ? SUCCESS : sleepScore>=60 ? WARNING : DANGER;

  const weightChartData = (data?.weightHistory??[]).map(d=>({
    date: format(parseISO(d.date),"d MMM",{locale:fr}),
    Poids: d.value, Tendance: d.ma,
  }));

  return (
    <div style={{ padding:"0 20px",display:"flex",flexDirection:"column",gap:20 }}>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <motion.div
        className="blur-slide-up"
        style={{ paddingTop:60,paddingBottom:4 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p style={{ fontFamily:"var(--font-mono)",fontSize:10,fontWeight:500,letterSpacing:"0.12em",textTransform:"uppercase",color:ACCENT,marginBottom:6 }}>
              AUJOURD'HUI
            </p>
            <h1 style={{ fontFamily:"var(--font-display)",fontSize:52,letterSpacing:"0.01em",lineHeight:1,color:"var(--text-primary)" }}>
              {dateLabel}
            </h1>
            <TypewriterGreeting/>
          </div>
          <AvatarButton onClick={()=>router.push("/profil")}/>
        </div>
        <GradDiv/>
      </motion.div>

      {/* ── HERO CARD — SÉANCE ────────────────────────────────────────────── */}
      <motion.div className="blur-slide-up-1">
        <PulsingGlow intensity="medium">
          <Card3D maxRotation={6} className="animated-border-card" style={{ borderRadius:20 }}>
            <div className="glass-card carbon halo-cyan" style={{ borderRadius:20,padding:20,position:"relative",overflow:"hidden",border:`1px solid ${sessionColor}30` }}>
              {/* Color wash */}
              <div aria-hidden style={{ position:"absolute",top:-50,right:-50,width:180,height:180,borderRadius:"50%",background:`radial-gradient(circle, ${sessionColor}15 0%, transparent 70%)`,pointerEvents:"none" }}/>

              {workout ? (
                <>
                  <div className="flex items-center justify-between" style={{ marginBottom:12 }}>
                    <span style={{ background:sessionColor+"22",color:sessionColor,border:`1px solid ${sessionColor}55`,fontSize:10,fontWeight:700,padding:"4px 10px",borderRadius:999,letterSpacing:"0.1em" }}>
                      {workout.sessionLabel??workout.type}
                    </span>
                    <span style={{ fontFamily:"var(--font-mono)",fontSize:9,fontWeight:600,letterSpacing:"0.08em",color:data?.todayWorkout ? SUCCESS : "rgba(240,238,232,0.3)" }}>
                      {data?.todayWorkout ? "● SÉANCE DU JOUR" : "DERNIÈRE SÉANCE"}
                    </span>
                  </div>
                  <p style={{ fontFamily:"var(--font-display)",fontSize:40,letterSpacing:"0.02em",color:"var(--text-primary)",lineHeight:1,marginBottom:4 }}>{sessionName}</p>
                  <p style={{ color:"rgba(240,238,232,0.4)",fontSize:13,marginBottom:18 }}>{workout.type==="STRENGTH" ? "Musculation" : "Cardio"}</p>

                  {/* Stats row */}
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderTop:"1px solid rgba(255,255,255,0.08)",paddingTop:16 }}>
                    {[
                      {icon:<Clock size={12}/>,label:"DURÉE",value:workout.duration,unit:"min",decimals:0},
                      {icon:<Dumbbell size={12}/>,label:workout.distanceKm?"DISTANCE":"EXERCICES",value:workout.distanceKm??workout.exerciseCount,unit:workout.distanceKm?"km":"ex.",decimals:0},
                      {icon:<TrendingUp size={12}/>,label:"VOLUME",value:workout.totalVolume>0 ? workout.totalVolume/1000 : null,unit:workout.totalVolume>0?"t":"",decimals:1},
                    ].map((s,i)=>(
                      <div key={i} style={{ padding:"0 12px",borderLeft:i>0?"1px solid rgba(255,255,255,0.08)":"none",textAlign:i===0?"left":i===1?"center":"right" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:4,justifyContent:i===2?"flex-end":i===1?"center":"flex-start",color:ACCENT,marginBottom:6 }}>
                          {s.icon}
                          <span style={{ fontSize:9,fontWeight:600,letterSpacing:"0.1em",color:"rgba(240,238,232,0.25)" }}>{s.label}</span>
                        </div>
                        <p style={{ fontFamily:"var(--font-mono)",fontWeight:700,fontSize:22,color:"var(--text-primary)",lineHeight:1 }}>
                          {s.value==null ? <span style={{ opacity:0.3 }}>—</span> : <><FlipNumber value={s.value.toFixed(s.decimals)}/><span style={{ fontSize:11,color:"rgba(240,238,232,0.35)",marginLeft:2 }}>{s.unit}</span></>}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Weekly bar */}
                  <div style={{ marginTop:16,paddingTop:14,borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex justify-between" style={{ marginBottom:8 }}>
                      <span style={{ fontFamily:"var(--font-mono)",fontSize:10,color:"rgba(240,238,232,0.35)" }}>
                        {data?.weekSessions??0}/{sportsGoal} séances · semaine
                        {sportPct>100 && <span style={{ color:GOLD,marginLeft:6 }}>🔥 Objectif dépassé</span>}
                      </span>
                      <span style={{ fontFamily:"var(--font-mono)",fontSize:10,color:sportColor,fontWeight:700 }}>{Math.round(sportPct)}%</span>
                    </div>
                    <BeamProgress value={data?.weekSessions??0} max={sportsGoal} color={sportColor}/>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center" style={{ padding:"28px 0",gap:16 }}>
                  <PulsingGlow intensity="low">
                    <div style={{ width:64,height:64,borderRadius:"50%",background:`${ACCENT}12`,border:`1px solid ${ACCENT}30`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <Dumbbell size={28} style={{ color:ACCENT }}/>
                    </div>
                  </PulsingGlow>
                  <p style={{ fontFamily:"var(--font-display)",fontSize:22,color:"rgba(240,238,232,0.4)",letterSpacing:"0.04em" }}>AUCUNE SÉANCE AUJOURD'HUI</p>
                  <motion.button whileTap={{scale:0.96}} onClick={()=>router.push("/sport?modal=true")} className="shimmer-btn"
                    style={{ background:`linear-gradient(135deg, ${ACCENT}, #00B8CC)`,color:"#050508",padding:"13px 24px",borderRadius:14,fontWeight:700,fontSize:12,letterSpacing:"0.08em",boxShadow:`0 4px 24px ${ACCENT}30`,border:"none",cursor:"pointer",fontFamily:"var(--font-sans)" }}>
                    ENREGISTRER UNE SÉANCE →
                  </motion.button>
                </div>
              )}
            </div>
          </Card3D>
        </PulsingGlow>
      </motion.div>

      {/* ── MÉTRIQUES 2×2 ────────────────────────────────────────────────── */}
      <motion.div className="blur-slide-up-2" variants={staggerContainer} initial="initial" animate="animate">
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>

          {/* POIDS */}
          <motion.div whileHover={{ y:-7, scale:1.018 }} whileTap={{ scale:0.97 }}>
            <div className="glass-card" style={{ borderRadius:20,padding:16,height:110,display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
              <p style={{ fontFamily:"var(--font-mono)",fontSize:9,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(240,238,232,0.3)" }}>POIDS</p>
              <div>
                <p style={{ fontFamily:"var(--font-display)",fontSize:44,lineHeight:1,color:"var(--text-primary)" }}>
                  <CountStat value={data?.latestWeight?.value??null} unit="kg" decimals={1}/>
                </p>
                {weightDiff!=null && (
                  <div style={{ display:"flex",alignItems:"center",gap:3,marginTop:4 }}>
                    {weightDiff>0 ? <ArrowUp size={11} style={{ color:DANGER }}/> : <ArrowDown size={11} style={{ color:SUCCESS }}/>}
                    <span style={{ fontFamily:"var(--font-mono)",fontSize:11,fontWeight:600,color:weightDiff>0?DANGER:SUCCESS }}>{Math.abs(weightDiff).toFixed(1)} kg</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* CALORIES */}
          <motion.div whileHover={{ y:-7, scale:1.018 }} whileTap={{ scale:0.97 }}>
            <div className="glass-card" style={{ borderRadius:20,padding:16,height:110,display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
              <p style={{ fontFamily:"var(--font-mono)",fontSize:9,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(240,238,232,0.3)" }}>CALORIES</p>
              <div>
                <p style={{ fontFamily:"var(--font-display)",fontSize:44,lineHeight:1,color:"var(--text-primary)" }}>
                  <CountStat value={data?.todayCalories?.calories??null} unit="kcal"/>
                </p>
              </div>
              {data?.todayCalories && <BeamProgress value={data.todayCalories.calories} max={calorieGoal} color={calColor} height={2}/>}
            </div>
          </motion.div>

          {/* SOMMEIL */}
          <motion.div whileHover={{ y:-7, scale:1.018 }} whileTap={{ scale:0.97 }}>
            <div className="glass-card" style={{ borderRadius:20,padding:16,height:110,display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
              <p style={{ fontFamily:"var(--font-mono)",fontSize:9,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(240,238,232,0.3)" }}>SOMMEIL</p>
              <div>
                <p style={{ fontFamily:"var(--font-display)",fontSize:44,lineHeight:1,color:"var(--text-primary)" }}>
                  <CountStat value={data?.lastSleep?.duration??null} unit="h" decimals={1}/>
                </p>
                {sleepScore!=null && (
                  <span style={{ display:"inline-block",marginTop:4,background:sleepColor+"20",color:sleepColor,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:999,fontFamily:"var(--font-mono)" }}>
                    SCORE {sleepScore}
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* PATRIMOINE */}
          <motion.div whileHover={{ y:-7, scale:1.018 }} whileTap={{ scale:0.97 }}>
            <div className="glass-card-gold" style={{ borderRadius:20,padding:16,height:110,display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
              <p style={{ fontFamily:"var(--font-mono)",fontSize:9,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:GOLD+"aa" }}>PATRIMOINE</p>
              <div>
                <p style={{ fontFamily:"var(--font-mono)",fontWeight:700,fontSize:18,color:"var(--text-primary)",lineHeight:1.2 }}>
                  {data?.totalPatrimoine ? fmtEuro(data.totalPatrimoine.value) : "—"}
                </p>
                {data?.totalPatrimoine?.change7d!=null && (
                  <div style={{ display:"flex",alignItems:"center",gap:3,marginTop:4 }}>
                    {data.totalPatrimoine.change7d>0 ? <TrendingUp size={11} style={{ color:SUCCESS }}/> : <TrendingDown size={11} style={{ color:DANGER }}/>}
                    <span style={{ fontFamily:"var(--font-mono)",fontSize:10,fontWeight:600,color:data.totalPatrimoine.change7d>0?SUCCESS:DANGER }}>
                      {fmtEuro(Math.abs(data.totalPatrimoine.change7d))} /7j
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── OBJECTIFS ─────────────────────────────────────────────────────── */}
      <motion.div className="blur-slide-up-3">
        <div className="glass-card" style={{ borderRadius:20,padding:20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom:4 }}>
            <h2 style={{ fontFamily:"var(--font-display)",fontSize:26,letterSpacing:"0.03em",color:"var(--text-primary)" }}>OBJECTIFS</h2>
            <motion.button whileTap={{scale:0.95}} onClick={()=>router.push("/profil")} style={{ color:ACCENT,fontSize:13,fontWeight:500,background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:3,fontFamily:"var(--font-sans)",minHeight:44 }}>
              Régler <ChevronRight size={13}/>
            </motion.button>
          </div>
          <GradDiv/>
          <div style={{ display:"flex",flexDirection:"column",gap:18 }}>
            {[
              {icon:<Zap size={15} style={{ color:ACCENT }}/>,label:"Sessions / semaine",current:data?.weekSessions??0,max:sportsGoal,unit:`${data?.weekSessions??0}/${sportsGoal}`,color:sportColor},
              {icon:<Flame size={15} style={{ color:WARNING }}/>,label:"Calories moy. 7j",current:data?.avgCalories7d??0,max:calorieGoal,unit:`${data?.avgCalories7d??0} / ${calorieGoal} kcal`,color:calColor},
              ...(weightGoal && data?.latestWeight ? [{icon:<Target size={15} style={{ color:SUCCESS }}/>,label:"Objectif poids",current:Math.max(0,100-Math.abs(data.latestWeight.value-weightGoal)/Math.max(data.latestWeight.value,weightGoal)*100),max:100,unit:`${data.latestWeight.value} → ${weightGoal} kg`,color:SUCCESS}] : []),
            ].map((g,i)=>(
              <div key={i}>
                <div className="flex justify-between items-center" style={{ marginBottom:8 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>{g.icon}<span style={{ fontSize:13,fontWeight:600,color:"var(--text-primary)",fontFamily:"var(--font-sans)" }}>{g.label}</span></div>
                  <span style={{ fontFamily:"var(--font-mono)",fontWeight:700,fontSize:12,color:g.color }}>{g.unit}</span>
                </div>
                <BeamProgress value={g.current} max={g.max} color={g.color}/>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── TÂCHES ────────────────────────────────────────────────────────── */}
      <motion.div className="blur-slide-up-4">
        <div className="glass-card" style={{ borderRadius:20,padding:20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom:4 }}>
            <h2 style={{ fontFamily:"var(--font-display)",fontSize:26,letterSpacing:"0.03em",color:"var(--text-primary)" }}>À FAIRE</h2>
            <motion.span
              initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}}
              transition={{type:"spring",delay:0.6,stiffness:500,damping:25}}
              style={{ background:`${ACCENT}18`,color:ACCENT,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:999,fontFamily:"var(--font-mono)" }}
            >
              {visibleTasks.length}
            </motion.span>
          </div>
          <GradDiv/>

          {visibleTasks.length===0 ? (
            <motion.p initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
              style={{ color:"rgba(240,238,232,0.3)",fontSize:14,textAlign:"center",padding:"20px 0" }}>
              Toutes les tâches sont complétées 🎉
            </motion.p>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              <AnimatePresence initial={false}>
                {visibleTasks.map((task,i)=>{
                  const p = PRIORITY_STYLE[task.priority];
                  const done = completedIds.has(task.id);
                  return (
                    <motion.div key={task.id} layout
                      initial={{opacity:0,x:-12}} animate={{opacity:done?0.35:1,x:0}} exit={{opacity:0,height:0}}
                      transition={{...SPRING_STANDARD,delay:i*0.05}}
                      style={{ display:"flex",alignItems:"center",gap:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"12px 14px",position:"relative",overflow:"hidden" }}>
                      {/* Left indicator */}
                      <div style={{ position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:20,borderRadius:"0 2px 2px 0",background:p.indicator }}/>
                      {/* Checkbox */}
                      <motion.button whileTap={{scale:0.8}} onClick={()=>handleToggleTask(task.id)} style={{ flexShrink:0,marginLeft:4,background:"none",border:"none",cursor:"pointer",minWidth:28,minHeight:28 }}>
                        {done ? <CheckCircle2 size={22} style={{ color:ACCENT }}/> : <Circle size={22} style={{ color:`${ACCENT}55` }}/>}
                      </motion.button>
                      <p style={{ flex:1,fontSize:14,fontWeight:500,color:done?"rgba(240,238,232,0.25)":"var(--text-primary)",textDecoration:done?"line-through":"none",transition:"all 0.25s" }}>
                        {task.title}
                      </p>
                      <span style={{ fontSize:9,fontWeight:700,background:p.bg,color:p.text,padding:"3px 7px",borderRadius:6,letterSpacing:"0.06em",fontFamily:"var(--font-mono)" }}>{p.label}</span>
                      <motion.button whileTap={{scale:0.8}} onClick={()=>handleDeleteTask(task.id)} style={{ color:"rgba(240,238,232,0.18)",flexShrink:0,background:"none",border:"none",cursor:"pointer",minWidth:28,minHeight:28 }}>
                        <Trash2 size={13}/>
                      </motion.button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          <motion.button whileTap={{scale:0.95}} onClick={()=>setAddTaskOpen(true)}
            style={{ display:"flex",alignItems:"center",gap:6,color:ACCENT,fontSize:13,fontWeight:600,marginTop:16,background:"none",border:"none",cursor:"pointer",fontFamily:"var(--font-sans)",minHeight:44 }}>
            <Plus size={14}/> Ajouter une tâche
          </motion.button>
        </div>
      </motion.div>

      {/* ── GRAPHIQUE POIDS ───────────────────────────────────────────────── */}
      <motion.div className="blur-slide-up-5">
        <div className="glass-card" style={{ borderRadius:20,padding:20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom:4 }}>
            <h2 style={{ fontFamily:"var(--font-display)",fontSize:24,letterSpacing:"0.03em",color:"var(--text-primary)" }}>ÉVOLUTION</h2>
            <span style={{ fontFamily:"var(--font-mono)",fontSize:9,fontWeight:600,letterSpacing:"0.08em",background:"rgba(255,255,255,0.04)",color:"rgba(240,238,232,0.35)",padding:"4px 10px",borderRadius:8 }}>30 JOURS</span>
          </div>
          <GradDiv/>
          {weightChartData.length>0 ? (
            <div style={{ position:"relative" }}>
              <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={weightChartData} margin={{top:5,right:5,bottom:0,left:-30}}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENT} stopOpacity={0.22}/>
                      <stop offset="100%" stopColor={ACCENT} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)"/>
                  <XAxis dataKey="date" tick={{fill:"rgba(240,238,232,0.25)",fontSize:10}} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                  <Tooltip content={<ChartTooltip/>} cursor={{stroke:`${ACCENT}40`,strokeWidth:1,strokeDasharray:"4 4"}}/>
                  <Area type="monotone" dataKey="Poids" stroke={ACCENT} strokeWidth={2.5} fill="url(#wGrad)" dot={false} activeDot={{r:6,fill:"#fff",stroke:ACCENT,strokeWidth:2}}/>
                  <Line type="monotone" dataKey="Tendance" stroke={GOLD} strokeWidth={1.5} strokeDasharray="6 3" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
              <div className="scanlines" aria-hidden style={{ position:"absolute",inset:0,borderRadius:12,pointerEvents:"none",opacity:0.35 }}/>
            </div>
          ) : (
            <div style={{ height:120,display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(240,238,232,0.2)",fontSize:13 }}>Aucune donnée de poids</div>
          )}
          {/* Legend */}
          <div style={{ display:"flex",gap:16,marginTop:12 }}>
            {[["Poids",ACCENT,false],[`Tendance 7j`,GOLD,true]].map(([l,c,dashed])=>(
              <div key={l as string} style={{ display:"flex",alignItems:"center",gap:6 }}>
                <div style={{ width:16,height:2,borderRadius:1,background:c as string,opacity:dashed?0.6:1 }}/>
                <span style={{ fontFamily:"var(--font-mono)",fontSize:9,color:"rgba(240,238,232,0.35)",letterSpacing:"0.06em" }}>{l as string}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <AddTaskSheet open={addTaskOpen} onClose={()=>setAddTaskOpen(false)} onAdd={handleAddTask}/>
    </div>
  );
}
