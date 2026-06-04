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
import RadarPulse from "@/components/RadarPulse";
import GlitchText from "@/components/GlitchText";
import DataStreamNumber from "@/components/DataStreamNumber";
import { useCountUp } from "@/hooks/useCountUp";
import { staggerContainer, SPRING_STANDARD, gradientDividerStyle } from "@/lib/motion";

// ─── Palette ──────────────────────────────────────────────────────────────────
const ACCENT  = "#6366F1";
const GOLD    = "#F59E0B";
const SUCCESS = "#10B981";
const DANGER  = "#EF4444";
const WARNING = "#F59E0B";

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

// ─── Session config ────────────────────────────────────────────────────────────
const SESSION_BADGE: Record<string, string> = {
  PUSH:"badge-push",PULL:"badge-pull",LEGS:"badge-legs",
  RUNNING:"badge-cardio",CARDIO:"badge-cardio",FULL_BODY:"badge-other",OTHER:"badge-other",
};
const SESSION_COLOR: Record<string,string> = {
  PUSH:ACCENT,PULL:SUCCESS,LEGS:GOLD,RUNNING:DANGER,CARDIO:DANGER,FULL_BODY:"#A78BFA",OTHER:"#64748B",
};
const SESSION_LABELS: Record<string,string> = {
  PUSH:"Push Day",PULL:"Pull Day",LEGS:"Leg Day",
  RUNNING:"Running",CARDIO:"Cardio",FULL_BODY:"Full Body",OTHER:"Autre",
};
const PRIORITY_STYLE: Record<string,{bg:string;text:string;label:string;indicator:string}> = {
  HIGH:  {bg:`${DANGER}18`, text:DANGER, label:"HAUTE", indicator:DANGER},
  MEDIUM:{bg:`${GOLD}18`,   text:GOLD,   label:"MOY.",  indicator:GOLD},
  LOW:   {bg:"rgba(255,255,255,0.04)",text:"rgba(248,248,255,0.3)",label:"BASSE",indicator:"rgba(248,248,255,0.1)"},
};

function fmtEuro(n: number) {
  return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
}
function progressColor(pct: number) {
  return pct < 40 ? DANGER : pct < 80 ? WARNING : pct <= 100 ? ACCENT : GOLD;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "Bonjour Baptiste";
  if (h >= 12 && h < 18) return "Bon après-midi Baptiste";
  return "Bonsoir Baptiste";
}

// ─── Typewriter greeting ──────────────────────────────────────────────────────
function TypewriterGreeting() {
  const full = getGreeting();
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++; setDisplayed(full.slice(0, i));
      if (i >= full.length) clearInterval(iv);
    }, 40);
    return () => clearInterval(iv);
  }, [full]);
  return (
    <p style={{ fontFamily:"var(--font-space)",color:"rgba(248,248,255,0.5)",fontSize:15,marginTop:6 }}>
      {displayed}
      {displayed.length < full.length && (
        <span style={{ animation:"typewriterBlink 0.8s ease-in-out infinite" }}>|</span>
      )}
    </p>
  );
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
function AvatarButton({ onClick }: { onClick: ()=>void }) {
  return (
    <motion.button
      onClick={onClick} whileTap={{scale:0.9}}
      style={{ position:"relative",width:48,height:48,borderRadius:"50%",background:"transparent",border:"none",cursor:"pointer",flexShrink:0 }}
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
        fontFamily:"var(--font-syne)",fontSize:20,fontWeight:800,color:ACCENT,
      }}>B</span>
    </motion.button>
  );
}

// ─── BeamProgress ─────────────────────────────────────────────────────────────
function BeamProgress({ value, max, color=ACCENT, height=4 }: {value:number;max:number;color?:string;height?:number}) {
  const [w, setW] = useState(0);
  const pct = max > 0 ? Math.min((value/max)*100,100) : 0;
  useEffect(()=>{ const t=setTimeout(()=>setW(pct),150); return()=>clearTimeout(t); },[pct]);
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
function GradDiv({ color=ACCENT }: {color?:string}) {
  return <div style={gradientDividerStyle(color)}/>;
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active||!payload?.length) return null;
  return (
    <div className="holo-card" style={{ borderRadius:12,padding:"10px 14px",minWidth:100 }}>
      <p style={{ fontFamily:"var(--font-space)",color:"rgba(248,248,255,0.4)",fontSize:11,marginBottom:4 }}>{label}</p>
      <p style={{ fontFamily:"var(--font-space)",fontWeight:700,fontSize:16,color:"var(--text-primary)",fontVariantNumeric:"tabular-nums" }}>{payload[0].value} kg</p>
    </div>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, unit, sub, change, gold=false, delay=0 }: {
  label:string; value:number|null; unit?:string; sub?:string;
  change?:number|null; gold?:boolean; delay?:number;
}) {
  const str = useCountUp({ to:value??0, decimals:unit==="h"||unit==="kg"?1:0, enabled:value!=null });
  return (
    <motion.div
      className="blur-slide-up"
      style={{ animationDelay:`${delay}s`, height:"100%" }}
      whileHover={{ y:-5, scale:1.015 }}
      whileTap={{ scale:0.97 }}
      transition={{ type:"spring",stiffness:300,damping:22 }}
    >
      <div className={gold?"holo-card holo-card-gold":"holo-card"} style={{ height:110,padding:16,display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
        <p style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",color:gold?"rgba(245,158,11,0.6)":"rgba(248,248,255,0.25)" }}>{label}</p>
        <div>
          <p style={{ fontFamily:"var(--font-syne)",fontWeight:800,fontSize:40,lineHeight:1,color:"var(--text-primary)",letterSpacing:"-0.02em" }}>
            {value==null ? <span style={{ opacity:0.25 }}>—</span> : <DataStreamNumber value={str} delay={delay*1000} duration={900}/>}
            {unit && value!=null && <span style={{ fontSize:16,fontFamily:"var(--font-space)",fontWeight:400,color:"rgba(248,248,255,0.35)",marginLeft:4 }}>{unit}</span>}
          </p>
          {sub && <p style={{ fontFamily:"var(--font-space)",fontSize:10,color:"rgba(248,248,255,0.35)",marginTop:3 }}>{sub}</p>}
          {change!=null && (
            <div style={{ display:"flex",alignItems:"center",gap:3,marginTop:3 }}>
              {change>0 ? <ArrowUp size={10} style={{ color:DANGER }}/> : <ArrowDown size={10} style={{ color:SUCCESS }}/>}
              <span style={{ fontFamily:"var(--font-space)",fontWeight:600,fontSize:10,fontVariantNumeric:"tabular-nums",color:change>0?DANGER:SUCCESS }}>{Math.abs(change).toFixed(1)}{unit||""}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Add task sheet ────────────────────────────────────────────────────────────
function AddTaskSheet({ open, onClose, onAdd }: {open:boolean;onClose:()=>void;onAdd:(t:string,p:string)=>void}) {
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
          <motion.div className="fixed inset-0 z-40"
            style={{ background:"rgba(0,0,0,0.8)",backdropFilter:"blur(8px)" }}
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}/>
          <motion.div className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
            style={{ background:"rgba(7,7,16,0.98)",borderRadius:"24px 24px 0 0",border:`1px solid ${ACCENT}20`,borderBottom:"none",backdropFilter:"blur(30px)",paddingBottom:"env(safe-area-inset-bottom)" }}
            initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}} transition={SPRING_STANDARD}>
            <div style={{ width:40,height:4,borderRadius:999,background:"rgba(248,248,255,0.12)",margin:"12px auto 0" }}/>
            <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom:"1px solid rgba(99,102,241,0.1)" }}>
              <span style={{ fontFamily:"var(--font-syne)",fontWeight:800,fontSize:22,letterSpacing:"-0.01em",color:"var(--text-primary)" }}>Nouvelle tâche</span>
              <motion.button whileTap={{scale:0.9}} onClick={onClose} style={{ color:"rgba(248,248,255,0.35)",background:"none",border:"none",cursor:"pointer",minWidth:44,minHeight:44 }}>
                <X size={18}/>
              </motion.button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding:"20px",display:"flex",flexDirection:"column",gap:14 }}>
              <div style={{ borderBottom:`1px solid ${ACCENT}35`,paddingBottom:8 }}>
                <input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Titre de la tâche…"
                  style={{ background:"none",border:"none",outline:"none",color:"var(--text-primary)",fontSize:16,width:"100%",fontFamily:"var(--font-space)" }}/>
              </div>
              <div style={{ display:"flex",gap:8 }}>
                {(["HIGH","MEDIUM","LOW"] as const).map(p=>{
                  const s=PRIORITY_STYLE[p];
                  return (
                    <motion.button key={p} type="button" whileTap={{scale:0.95}} onClick={()=>setPriority(p)} style={{
                      flex:1,padding:"10px 4px",borderRadius:10,fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase" as const,
                      background:priority===p?s.bg:"var(--surface-3)",color:priority===p?s.text:"rgba(248,248,255,0.3)",
                      border:`1px solid ${priority===p?s.indicator+"50":"rgba(255,255,255,0.04)"}`,
                      cursor:"pointer",fontFamily:"var(--font-space)",minHeight:44,
                      transition:"all 0.18s cubic-bezier(0.32,0.72,0,1)",
                    }}>{s.label}</motion.button>
                  );
                })}
              </div>
              <motion.button type="submit" whileTap={{scale:0.97}} className="shimmer-btn" style={{
                background:`linear-gradient(135deg, ${ACCENT}, #4F46E5)`,color:"#fff",borderRadius:12,height:50,
                fontFamily:"var(--font-space)",fontWeight:700,fontSize:14,letterSpacing:"0.06em",
                border:"none",cursor:"pointer",boxShadow:`0 4px 24px ${ACCENT}35`,
              }}>
                Ajouter
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
          <div className="skeleton" style={{ height:11,width:80 }}/>
          <div className="skeleton" style={{ height:56,width:220 }}/>
          <div className="skeleton" style={{ height:15,width:160 }}/>
        </div>
        <div className="skeleton" style={{ width:48,height:48,borderRadius:"50%" }}/>
      </div>
      <div className="skeleton" style={{ height:240,borderRadius:20 }}/>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
        {[...Array(4)].map((_,i)=><div key={i} className="skeleton" style={{ height:110,borderRadius:20 }}/>)}
      </div>
      <div className="skeleton" style={{ height:160,borderRadius:20 }}/>
      <div className="skeleton" style={{ height:200,borderRadius:20 }}/>
      <div className="skeleton" style={{ height:200,borderRadius:20 }}/>
    </div>
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
    const wg=localStorage.getItem("weight_goal_kg"); if(wg) setWeightGoal(parseFloat(wg));
    fetch("/api/dashboard/home").then(r=>r.json())
      .then(d=>{ setData(d); setTasks(d.pendingTasks??[]); })
      .catch(()=>toast.error("Erreur de chargement"))
      .finally(()=>setLoading(false));
  },[]);

  async function handleToggleTask(id:string) {
    const newSet=new Set(completedIds);
    const was=newSet.has(id);
    if(!was) newSet.add(id); else newSet.delete(id);
    setCompletedIds(newSet);
    await fetch(`/api/tasks/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({completed:!was})});
    if(!was&&Array.from(newSet).length===tasks.length) toast.success("Toutes les tâches complétées 🎉");
  }
  async function handleDeleteTask(id:string) {
    setTasks(prev=>prev.filter(t=>t.id!==id));
    await fetch(`/api/tasks/${id}`,{method:"DELETE"});
  }
  async function handleAddTask(title:string, priority:string) {
    const res=await fetch("/api/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,priority,scope:"DAY",dueDate:new Date().toISOString().split("T")[0]})});
    if(res.ok){
      const task=await res.json();
      setTasks(prev=>[...prev,{id:task.id,title:task.title,priority:task.priority,scope:task.scope}]);
      toast.success("Tâche ajoutée !");
    }
  }

  if(loading) return <DashboardSkeleton/>;

  const dateWords = format(new Date(),"EEEE d MMMM",{locale:fr}).toUpperCase().split(" ");
  const workout = data?.todayWorkout ?? data?.lastWorkout;
  const sessionBadge = workout?.sessionLabel ? SESSION_BADGE[workout.sessionLabel] ?? "badge-other" : "badge-other";
  const sessionColor = workout?.sessionLabel ? SESSION_COLOR[workout.sessionLabel] : ACCENT;
  const sessionName  = workout?.sessionLabel ? SESSION_LABELS[workout.sessionLabel] : "SESSION";
  const visibleTasks = tasks.filter(t=>!completedIds.has(t.id)).slice(0,4);
  const sportPct = sportsGoal>0 ? (data?.weekSessions??0)/sportsGoal*100 : 0;
  const sportColor = progressColor(sportPct);
  const calPct = calorieGoal>0&&data?.avgCalories7d ? data.avgCalories7d/calorieGoal*100 : 0;
  const calColor = progressColor(calPct);
  const weightDiff = data?.latestWeight?.previousValue!=null ? data.latestWeight!.value-data.latestWeight!.previousValue! : null;
  const sleepScore = data?.lastSleep?.score??null;
  const sleepColor = sleepScore==null?"rgba(248,248,255,0.3)":sleepScore>=80?SUCCESS:sleepScore>=60?WARNING:DANGER;

  const weightChartData = (data?.weightHistory??[]).map(d=>({
    date:format(parseISO(d.date),"d MMM",{locale:fr}),
    Poids:d.value, Tendance:d.ma,
  }));

  return (
    <div style={{ padding:"0 20px",display:"flex",flexDirection:"column",gap:20 }}>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="blur-slide-up" style={{ paddingTop:60 }}>
        <div className="flex items-start justify-between" style={{ marginBottom:4 }}>
          <div>
            <p style={{ fontFamily:"var(--font-space)",fontSize:10,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",color:ACCENT,marginBottom:8 }}>
              AUJOURD'HUI
            </p>
            <GlitchText as="h1" style={{
              fontFamily:"var(--font-syne)",fontWeight:800,fontSize:52,
              letterSpacing:"-0.03em",lineHeight:1,color:"var(--text-primary)",display:"block",
            }}>
              {dateWords.join(" ")}
            </GlitchText>
            <TypewriterGreeting/>
          </div>
          <AvatarButton onClick={()=>router.push("/profil")}/>
        </div>
        <GradDiv/>
      </div>

      {/* ── HERO CARD — SÉANCE ────────────────────────────────────────────── */}
      <div className="blur-slide-up-1">
        <Card3D maxRotation={5} className="animated-border-card" style={{ borderRadius:20 }}>
          <div className="holo-card holo-card-hero carbon" style={{ borderRadius:20,padding:22,position:"relative",overflow:"hidden",border:`1px solid ${sessionColor}25` }}>
            {/* Radar pulse — top right */}
            <div style={{ position:"absolute",top:12,right:12,opacity:0.7,zIndex:1 }}>
              <RadarPulse size={90} color={sessionColor}/>
            </div>
            {/* Background glow */}
            <div aria-hidden style={{ position:"absolute",top:-60,right:-60,width:200,height:200,borderRadius:"50%",background:`radial-gradient(circle, ${sessionColor}12 0%, transparent 70%)`,pointerEvents:"none" }}/>

            {workout ? (
              <>
                <div className="flex items-center justify-between" style={{ marginBottom:14,paddingRight:90 }}>
                  <span className={`badge-ppl ${sessionBadge}`}>
                    {workout.sessionLabel??workout.type}
                  </span>
                  <span style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:600,letterSpacing:"0.1em",color:data?.todayWorkout?SUCCESS:"rgba(248,248,255,0.3)" }}>
                    {data?.todayWorkout?"● SÉANCE DU JOUR":"DERNIÈRE SÉANCE"}
                  </span>
                </div>

                <GlitchText as="p" style={{
                  fontFamily:"var(--font-syne)",fontWeight:800,fontSize:38,
                  letterSpacing:"-0.02em",color:"var(--text-primary)",lineHeight:1,
                  marginBottom:4,display:"block",
                }}>
                  {sessionName}
                </GlitchText>
                <p style={{ fontFamily:"var(--font-space)",color:"rgba(248,248,255,0.4)",fontSize:13,marginBottom:20 }}>
                  {workout.type==="STRENGTH"?"Musculation":"Cardio"}
                </p>

                {/* Stats row */}
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderTop:"1px solid rgba(99,102,241,0.1)",paddingTop:16 }}>
                  {[
                    {icon:<Clock size={12}/>,label:"DURÉE",     value:`${workout.duration}`,unit:"min"},
                    {icon:<Dumbbell size={12}/>,label:workout.distanceKm?"DISTANCE":"EXERCICES", value:workout.distanceKm?`${workout.distanceKm}`:`${workout.exerciseCount}`,unit:workout.distanceKm?"km":"ex."},
                    {icon:<TrendingUp size={12}/>,label:"VOLUME",value:workout.totalVolume>0?`${(workout.totalVolume/1000).toFixed(1)}`:"—",unit:workout.totalVolume>0?"t":""},
                  ].map((s,i)=>(
                    <div key={i} style={{ padding:"0 12px",borderLeft:i>0?"1px solid rgba(99,102,241,0.1)":"none",textAlign:i===0?"left":i===1?"center":"right" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:4,justifyContent:i===2?"flex-end":i===1?"center":"flex-start",color:ACCENT,marginBottom:6 }}>
                        {s.icon}
                        <span style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:600,letterSpacing:"0.12em",color:"rgba(248,248,255,0.25)" }}>{s.label}</span>
                      </div>
                      <p style={{ fontFamily:"var(--font-syne)",fontWeight:800,fontSize:22,color:"var(--text-primary)",lineHeight:1,letterSpacing:"-0.01em" }}>
                        <DataStreamNumber value={s.value} delay={400+i*100} duration={700}/>
                        <span style={{ fontFamily:"var(--font-space)",fontSize:11,fontWeight:400,color:"rgba(248,248,255,0.35)",marginLeft:2 }}>{s.unit}</span>
                      </p>
                    </div>
                  ))}
                </div>

                {/* Weekly progress */}
                <div style={{ marginTop:16,paddingTop:14,borderTop:"1px solid rgba(99,102,241,0.08)" }}>
                  <div className="flex justify-between" style={{ marginBottom:8 }}>
                    <span style={{ fontFamily:"var(--font-space)",fontSize:10,color:"rgba(248,248,255,0.35)" }}>
                      {data?.weekSessions??0}/{sportsGoal} séances · semaine
                      {sportPct>100&&<span style={{ color:GOLD,marginLeft:6 }}>🔥 Objectif dépassé</span>}
                    </span>
                    <span style={{ fontFamily:"var(--font-space)",fontWeight:700,fontSize:10,color:sportColor,fontVariantNumeric:"tabular-nums" }}>{Math.round(sportPct)}%</span>
                  </div>
                  <BeamProgress value={data?.weekSessions??0} max={sportsGoal} color={sportColor}/>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center" style={{ padding:"28px 0",gap:16 }}>
                <div style={{ width:64,height:64,borderRadius:"50%",background:`${ACCENT}12`,border:`1px solid ${ACCENT}30`,display:"flex",alignItems:"center",justifyContent:"center",animation:"fabPulse 2s ease-in-out infinite" }}>
                  <Dumbbell size={28} style={{ color:ACCENT }}/>
                </div>
                <p style={{ fontFamily:"var(--font-syne)",fontWeight:700,fontSize:20,color:"rgba(248,248,255,0.4)",letterSpacing:"-0.01em" }}>Aucune séance aujourd'hui</p>
                <motion.button whileTap={{scale:0.96}} onClick={()=>router.push("/sport?modal=true")} className="shimmer-btn"
                  style={{ background:`linear-gradient(135deg, ${ACCENT}, #4F46E5)`,color:"#fff",padding:"13px 24px",borderRadius:12,fontFamily:"var(--font-space)",fontWeight:700,fontSize:13,letterSpacing:"0.06em",boxShadow:`0 4px 24px ${ACCENT}35`,border:"none",cursor:"pointer" }}>
                  Enregistrer une séance →
                </motion.button>
              </div>
            )}
          </div>
        </Card3D>
      </div>

      {/* ── MÉTRIQUES 2×2 ────────────────────────────────────────────────── */}
      <motion.div className="blur-slide-up-2" variants={staggerContainer} initial="initial" animate="animate">
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          <MetricCard label="POIDS" value={data?.latestWeight?.value??null} unit="kg" change={weightDiff} delay={0}/>
          <div className="blur-slide-up-2" style={{ animationDelay:"0.09s" }}>
            <div className="holo-card" style={{ height:110,padding:16,display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
              <p style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",color:"rgba(248,248,255,0.25)" }}>CALORIES</p>
              <p style={{ fontFamily:"var(--font-syne)",fontWeight:800,fontSize:40,lineHeight:1,color:"var(--text-primary)",letterSpacing:"-0.02em" }}>
                {data?.todayCalories
                  ? <DataStreamNumber value={data.todayCalories.calories} delay={200} duration={900}/>
                  : <span style={{ opacity:0.25 }}>—</span>}
                <span style={{ fontSize:14,fontFamily:"var(--font-space)",fontWeight:400,color:"rgba(248,248,255,0.35)",marginLeft:4 }}>kcal</span>
              </p>
              {data?.todayCalories&&<BeamProgress value={data.todayCalories.calories} max={calorieGoal} color={calColor} height={2}/>}
            </div>
          </div>
          <div className="blur-slide-up-2" style={{ animationDelay:"0.18s" }}>
            <div className="holo-card" style={{ height:110,padding:16,display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
              <p style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",color:"rgba(248,248,255,0.25)" }}>SOMMEIL</p>
              <div>
                <p style={{ fontFamily:"var(--font-syne)",fontWeight:800,fontSize:40,lineHeight:1,color:"var(--text-primary)",letterSpacing:"-0.02em" }}>
                  {data?.lastSleep
                    ? <DataStreamNumber value={data.lastSleep.duration.toFixed(1)} delay={300} duration={900}/>
                    : <span style={{ opacity:0.25 }}>—</span>}
                  <span style={{ fontSize:14,fontFamily:"var(--font-space)",fontWeight:400,color:"rgba(248,248,255,0.35)",marginLeft:4 }}>h</span>
                </p>
                {sleepScore!=null&&(
                  <span style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:700,background:sleepColor+"18",color:sleepColor,padding:"2px 7px",borderRadius:999,letterSpacing:"0.08em" }}>
                    SCORE {sleepScore}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="blur-slide-up-2" style={{ animationDelay:"0.27s" }}>
            <div className="holo-card holo-card-gold" style={{ height:110,padding:16,display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
              <p style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",color:`${GOLD}99` }}>PATRIMOINE</p>
              <div>
                <p style={{ fontFamily:"var(--font-space)",fontWeight:700,fontSize:17,color:"var(--text-primary)",lineHeight:1.2,fontVariantNumeric:"tabular-nums" }}>
                  {data?.totalPatrimoine ? fmtEuro(data.totalPatrimoine.value) : "—"}
                </p>
                {data?.totalPatrimoine?.change7d!=null&&(
                  <div style={{ display:"flex",alignItems:"center",gap:3,marginTop:4 }}>
                    {data.totalPatrimoine.change7d>0?<TrendingUp size={10} style={{ color:SUCCESS }}/>:<TrendingDown size={10} style={{ color:DANGER }}/>}
                    <span style={{ fontFamily:"var(--font-space)",fontWeight:600,fontSize:10,fontVariantNumeric:"tabular-nums",color:data.totalPatrimoine.change7d>0?SUCCESS:DANGER }}>
                      {fmtEuro(Math.abs(data.totalPatrimoine.change7d))} /7j
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── OBJECTIFS ────────────────────────────────────────────────────── */}
      <div className="blur-slide-up-3">
        <div className="holo-card" style={{ borderRadius:20,padding:20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom:4 }}>
            <h2 style={{ fontFamily:"var(--font-syne)",fontWeight:800,fontSize:26,letterSpacing:"-0.02em",color:"var(--text-primary)" }}>Objectifs</h2>
            <motion.button whileTap={{scale:0.95}} onClick={()=>router.push("/profil")} style={{ fontFamily:"var(--font-space)",color:ACCENT,fontSize:13,fontWeight:500,background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:3,minHeight:44 }}>
              Régler <ChevronRight size={13}/>
            </motion.button>
          </div>
          <GradDiv/>
          <div style={{ display:"flex",flexDirection:"column",gap:18 }}>
            {[
              {icon:<Zap size={14} style={{ color:ACCENT }}/>,label:"Sessions cette semaine",current:data?.weekSessions??0,max:sportsGoal,unit:`${data?.weekSessions??0}/${sportsGoal}`,color:sportColor},
              {icon:<Flame size={14} style={{ color:GOLD }}/>,label:"Calories moy. 7j",current:data?.avgCalories7d??0,max:calorieGoal,unit:`${data?.avgCalories7d??0} / ${calorieGoal} kcal`,color:calColor},
              ...(weightGoal&&data?.latestWeight ? [{icon:<Target size={14} style={{ color:SUCCESS }}/>,label:"Objectif poids",current:Math.max(0,100-Math.abs(data.latestWeight.value-weightGoal)/Math.max(data.latestWeight.value,weightGoal)*100),max:100,unit:`${data.latestWeight.value} → ${weightGoal} kg`,color:SUCCESS}] : []),
            ].map((g,i)=>(
              <div key={i}>
                <div className="flex justify-between items-center" style={{ marginBottom:8 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>{g.icon}<span style={{ fontFamily:"var(--font-space)",fontSize:13,fontWeight:600,color:"var(--text-primary)" }}>{g.label}</span></div>
                  <span style={{ fontFamily:"var(--font-space)",fontWeight:700,fontSize:12,color:g.color,fontVariantNumeric:"tabular-nums" }}>{g.unit}</span>
                </div>
                <BeamProgress value={g.current} max={g.max} color={g.color}/>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TÂCHES ───────────────────────────────────────────────────────── */}
      <div className="blur-slide-up-4">
        <div className="holo-card" style={{ borderRadius:20,padding:20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom:4 }}>
            <h2 style={{ fontFamily:"var(--font-syne)",fontWeight:800,fontSize:26,letterSpacing:"-0.02em",color:"var(--text-primary)" }}>À faire</h2>
            <motion.span initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",delay:0.6,stiffness:500,damping:25}}
              style={{ fontFamily:"var(--font-space)",background:`${ACCENT}18`,color:ACCENT,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:999,fontVariantNumeric:"tabular-nums" }}>
              {visibleTasks.length}
            </motion.span>
          </div>
          <GradDiv/>
          {visibleTasks.length===0 ? (
            <motion.p initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
              style={{ fontFamily:"var(--font-space)",color:"rgba(248,248,255,0.3)",fontSize:14,textAlign:"center",padding:"20px 0" }}>
              Toutes les tâches sont complétées 🎉
            </motion.p>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              <AnimatePresence initial={false}>
                {visibleTasks.map((task,i)=>{
                  const p=PRIORITY_STYLE[task.priority];
                  const done=completedIds.has(task.id);
                  return (
                    <motion.div key={task.id} layout
                      initial={{opacity:0,x:-12}} animate={{opacity:done?0.35:1,x:0}} exit={{opacity:0,height:0}}
                      transition={{...SPRING_STANDARD,delay:i*0.05}}
                      style={{ display:"flex",alignItems:"center",gap:12,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(99,102,241,0.08)",borderRadius:12,padding:"12px 14px",position:"relative",overflow:"hidden" }}>
                      {/* Left priority indicator */}
                      <div style={{ position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:22,borderRadius:"0 2px 2px 0",background:p.indicator }}/>
                      <motion.button whileTap={{scale:0.8}} onClick={()=>handleToggleTask(task.id)} style={{ flexShrink:0,marginLeft:4,background:"none",border:"none",cursor:"pointer",minWidth:28,minHeight:28 }}>
                        {done?<CheckCircle2 size={20} style={{ color:ACCENT }}/>:<Circle size={20} style={{ color:`${ACCENT}55` }}/>}
                      </motion.button>
                      <p style={{ flex:1,fontFamily:"var(--font-space)",fontSize:14,fontWeight:500,color:done?"rgba(248,248,255,0.25)":"var(--text-primary)",textDecoration:done?"line-through":"none",transition:"all 0.25s" }}>
                        {task.title}
                      </p>
                      <span style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:700,background:p.bg,color:p.text,padding:"3px 7px",borderRadius:6,letterSpacing:"0.08em",textTransform:"uppercase" as const }}>
                        {p.label}
                      </span>
                      <motion.button whileTap={{scale:0.8}} onClick={()=>handleDeleteTask(task.id)} style={{ color:"rgba(248,248,255,0.18)",flexShrink:0,background:"none",border:"none",cursor:"pointer",minWidth:28,minHeight:28 }}>
                        <Trash2 size={13}/>
                      </motion.button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
          <motion.button whileTap={{scale:0.95}} onClick={()=>setAddTaskOpen(true)}
            style={{ display:"flex",alignItems:"center",gap:6,fontFamily:"var(--font-space)",color:ACCENT,fontSize:13,fontWeight:600,marginTop:16,background:"none",border:"none",cursor:"pointer",minHeight:44 }}>
            <Plus size={14}/> Ajouter une tâche
          </motion.button>
        </div>
      </div>

      {/* ── GRAPHIQUE POIDS ──────────────────────────────────────────────── */}
      <div className="blur-slide-up-5">
        <div className="holo-card" style={{ borderRadius:20,padding:20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom:4 }}>
            <h2 style={{ fontFamily:"var(--font-syne)",fontWeight:800,fontSize:24,letterSpacing:"-0.02em",color:"var(--text-primary)" }}>Évolution</h2>
            <span style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:600,letterSpacing:"0.1em",background:"rgba(255,255,255,0.04)",color:"rgba(248,248,255,0.35)",padding:"4px 10px",borderRadius:8 }}>30 JOURS</span>
          </div>
          <GradDiv/>
          {weightChartData.length>0 ? (
            <div style={{ position:"relative" }}>
              <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={weightChartData} margin={{top:5,right:5,bottom:0,left:-30}}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENT} stopOpacity={0.2}/>
                      <stop offset="100%" stopColor={ACCENT} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(99,102,241,0.06)"/>
                  <XAxis dataKey="date" tick={{fill:"rgba(248,248,255,0.25)",fontSize:10,fontFamily:"var(--font-space)"}} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                  <Tooltip content={<ChartTooltip/>} cursor={{stroke:`${ACCENT}40`,strokeWidth:1,strokeDasharray:"4 4"}}/>
                  <Area type="monotone" dataKey="Poids" stroke={ACCENT} strokeWidth={2.5} fill="url(#wGrad)" dot={false} activeDot={{r:6,fill:"#fff",stroke:ACCENT,strokeWidth:2}}/>
                  <Line type="monotone" dataKey="Tendance" stroke={GOLD} strokeWidth={1.5} strokeDasharray="6 3" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
              <div className="scanlines" aria-hidden style={{ position:"absolute",inset:0,borderRadius:12,pointerEvents:"none",opacity:0.3 }}/>
            </div>
          ) : (
            <div style={{ height:120,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-space)",color:"rgba(248,248,255,0.2)",fontSize:13 }}>Aucune donnée</div>
          )}
          <div style={{ display:"flex",gap:16,marginTop:12 }}>
            {[["Poids",ACCENT,false],[`Tendance 7j`,GOLD,true]].map(([l,c,dash])=>(
              <div key={l as string} style={{ display:"flex",alignItems:"center",gap:6 }}>
                <div style={{ width:14,height:2,borderRadius:1,background:c as string,opacity:dash?0.6:1 }}/>
                <span style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:500,color:"rgba(248,248,255,0.35)" }}>{l as string}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AddTaskSheet open={addTaskOpen} onClose={()=>setAddTaskOpen(false)} onAdd={handleAddTask}/>
    </div>
  );
}
