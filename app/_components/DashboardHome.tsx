"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell, Clock, TrendingUp, Zap, Flame, Target,
  CheckCircle2, Circle, Trash2, Plus, X, ChevronRight,
  ArrowUp, ArrowDown,
} from "lucide-react";
import { Line, XAxis, Tooltip, ResponsiveContainer, Area, AreaChart, CartesianGrid } from "recharts";
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

// ─── Monochrome tokens ─────────────────────────────────────────────────────────
const W100 = "#FFFFFF";
const W70  = "rgba(255,255,255,0.70)";
const W50  = "rgba(255,255,255,0.50)";
const W30  = "rgba(255,255,255,0.30)";
const W15  = "rgba(255,255,255,0.15)";
const W08  = "rgba(255,255,255,0.08)";

// ─── Types ─────────────────────────────────────────────────────────────────────
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

const SESSION_BADGE: Record<string,string> = {
  PUSH:"badge-push",PULL:"badge-pull",LEGS:"badge-legs",RUNNING:"badge-cardio",CARDIO:"badge-cardio",FULL_BODY:"badge-other",OTHER:"badge-other",
};
const SESSION_LABELS: Record<string,string> = {
  PUSH:"Push Day",PULL:"Pull Day",LEGS:"Leg Day",RUNNING:"Running",CARDIO:"Cardio",FULL_BODY:"Full Body",OTHER:"Autre",
};
const PRIORITY_STYLE: Record<string,{bg:string;text:string;label:string;indicator:string}> = {
  HIGH:  { bg:"rgba(255,255,255,0.10)", text:W100, label:"HAUTE",  indicator:W50 },
  MEDIUM:{ bg:"rgba(255,255,255,0.06)", text:W70,  label:"MOY.",   indicator:W30 },
  LOW:   { bg:"rgba(255,255,255,0.03)", text:W30,  label:"BASSE",  indicator:W15 },
};

function fmtEuro(n: number) {
  return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
}

// ─── Typewriter ────────────────────────────────────────────────────────────────
function TypewriterGreeting() {
  const h = new Date().getHours();
  const full = h < 12 ? "Bonjour Baptiste" : h < 18 ? "Bon après-midi Baptiste" : "Bonsoir Baptiste";
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => { i++; setDisplayed(full.slice(0,i)); if(i>=full.length) clearInterval(iv); }, 40);
    return () => clearInterval(iv);
  }, [full]);
  return (
    <p style={{ fontFamily:"var(--font-space)",color:W50,fontSize:15,marginTop:6 }}>
      {displayed}
      {displayed.length < full.length && <span style={{ animation:"typewriterBlink 0.8s ease-in-out infinite" }}>|</span>}
    </p>
  );
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
function AvatarButton({ onClick }: { onClick:()=>void }) {
  return (
    <motion.button onClick={onClick} whileTap={{scale:0.9}}
      style={{ position:"relative",width:48,height:48,borderRadius:"50%",background:"transparent",border:"none",cursor:"pointer",flexShrink:0 }}>
      <span aria-hidden style={{
        position:"absolute",inset:-2,borderRadius:"50%",
        background:"conic-gradient(rgba(255,255,255,0.8), rgba(255,255,255,0.1), rgba(255,255,255,0.8))",
        animation:"rotateBorder 4s linear infinite",zIndex:0,
      }}/>
      <span style={{ position:"absolute",inset:2,borderRadius:"50%",background:"rgba(5,5,5,0.9)",zIndex:1,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-orbitron)",fontSize:18,fontWeight:800,color:W100 }}>B</span>
    </motion.button>
  );
}

// ─── BeamProgress ──────────────────────────────────────────────────────────────
function BeamProgress({ value, max, height=4 }: {value:number;max:number;height?:number}) {
  const [w, setW] = useState(0);
  const pct = max>0 ? Math.min((value/max)*100,100) : 0;
  useEffect(()=>{ const t=setTimeout(()=>setW(pct),150); return()=>clearTimeout(t); },[pct]);
  return (
    <div style={{ background:"rgba(255,255,255,0.08)",borderRadius:999,height,overflow:"hidden",position:"relative" }}>
      <div className="beam-progress" style={{
        height:"100%",borderRadius:999,width:`${w}%`,
        background:"linear-gradient(90deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))",
        boxShadow:"0 0 8px rgba(255,255,255,0.3)",
        transition:"width 1.2s cubic-bezier(0.32,0.72,0,1)",
      }}/>
    </div>
  );
}

// ─── GradDiv ──────────────────────────────────────────────────────────────────
function GradDiv() {
  return <div style={gradientDividerStyle()}/>;
}

// ─── Chart tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active||!payload?.length) return null;
  return (
    <div className="holo-card" style={{ borderRadius:12,padding:"10px 14px",minWidth:100 }}>
      <p style={{ fontFamily:"var(--font-space)",color:W30,fontSize:11,marginBottom:4 }}>{label}</p>
      <p style={{ fontFamily:"var(--font-orbitron)",fontWeight:700,fontSize:16,color:W100,fontVariantNumeric:"tabular-nums" }}>{payload[0].value} kg</p>
    </div>
  );
}

// ─── MetricCard ────────────────────────────────────────────────────────────────
function MetricCard({ label, value, unit, change, decimals=0 }: {
  label:string; value:number|null; unit?:string; change?:number|null; decimals?:number;
}) {
  const str = useCountUp({ to:value??0, decimals, enabled:value!=null });
  return (
    <motion.div whileHover={{y:-5,scale:1.015}} whileTap={{scale:0.97}} transition={{type:"spring",stiffness:300,damping:22}}>
      <div className="holo-card" style={{ height:110,padding:16,display:"flex",flexDirection:"column",justifyContent:"space-between",borderTop:`1px solid ${W08}` }}>
        <p style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:600,letterSpacing:"0.2em",textTransform:"uppercase",color:W30 }}>{label}</p>
        <div>
          <p style={{ fontFamily:"var(--font-orbitron)",fontWeight:800,fontSize:38,lineHeight:1,color:W100,letterSpacing:"-0.01em",fontVariantNumeric:"tabular-nums" }}>
            {value==null ? <span style={{ opacity:0.2 }}>—</span> : <DataStreamNumber value={str} duration={900}/>}
            {unit&&value!=null&&<span style={{ fontFamily:"var(--font-space)",fontSize:14,fontWeight:400,color:W30,marginLeft:4 }}>{unit}</span>}
          </p>
          {change!=null&&(
            <div style={{ display:"flex",alignItems:"center",gap:3,marginTop:3 }}>
              {change>0 ? <ArrowUp size={10} style={{ color:W50 }}/> : <ArrowDown size={10} style={{ color:W100 }}/>}
              <span style={{ fontFamily:"var(--font-space)",fontSize:10,fontVariantNumeric:"tabular-nums",color:change>0?W50:W100 }}>{Math.abs(change).toFixed(1)}{unit||""}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Add task sheet ─────────────────────────────────────────────────────────────
function AddTaskSheet({ open, onClose, onAdd }: {open:boolean;onClose:()=>void;onAdd:(t:string,p:string)=>void}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), priority); setTitle(""); setPriority("MEDIUM"); onClose();
  }
  return (
    <AnimatePresence>
      {open&&(
        <>
          <motion.div className="fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.85)",backdropFilter:"blur(8px)" }}
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}/>
          <motion.div className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
            style={{ background:"rgba(0,0,0,0.95)",borderRadius:"24px 24px 0 0",border:"1px solid rgba(255,255,255,0.12)",borderBottom:"none",backdropFilter:"blur(30px)",paddingBottom:"env(safe-area-inset-bottom)" }}
            initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}} transition={SPRING_STANDARD}>
            <div style={{ width:40,height:4,borderRadius:999,background:W15,margin:"12px auto 0" }}/>
            <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom:`1px solid ${W08}` }}>
              <span style={{ fontFamily:"var(--font-orbitron)",fontWeight:700,fontSize:20,letterSpacing:"0.02em",color:W100 }}>Nouvelle tâche</span>
              <motion.button whileTap={{scale:0.9}} onClick={onClose} style={{ color:W30,background:"none",border:"none",cursor:"pointer",minWidth:44,minHeight:44 }}>
                <X size={18}/>
              </motion.button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding:"20px",display:"flex",flexDirection:"column",gap:14 }}>
              <div style={{ borderBottom:`1px solid ${W30}`,paddingBottom:8 }}>
                <input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Titre de la tâche…"
                  style={{ background:"none",border:"none",outline:"none",color:W100,fontSize:16,width:"100%",fontFamily:"var(--font-space)" }}/>
              </div>
              <div style={{ display:"flex",gap:8 }}>
                {(["HIGH","MEDIUM","LOW"] as const).map(p=>{
                  const s=PRIORITY_STYLE[p]; const active=priority===p;
                  return (
                    <motion.button key={p} type="button" whileTap={{scale:0.95}} onClick={()=>setPriority(p)} style={{
                      flex:1,padding:"10px 4px",borderRadius:10,fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase" as const,
                      background:active?s.bg:"rgba(255,255,255,0.03)",color:active?s.text:W30,
                      border:`1px solid ${active?s.indicator:W08}`,cursor:"pointer",fontFamily:"var(--font-space)",minHeight:44,
                      transition:"all 0.18s",
                    }}>{s.label}</motion.button>
                  );
                })}
              </div>
              <motion.button type="submit" whileTap={{scale:0.97}} className="shimmer-btn" style={{
                background:W100,color:"#000",borderRadius:12,height:50,fontFamily:"var(--font-space)",
                fontWeight:700,fontSize:14,letterSpacing:"0.06em",border:"none",cursor:"pointer",
                boxShadow:"0 4px 24px rgba(255,255,255,0.15)",
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

// ─── Skeleton ───────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div style={{ padding:"60px 20px 0",display:"flex",flexDirection:"column",gap:20 }}>
      <div className="flex justify-between">
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          <div className="skeleton" style={{ height:10,width:80 }}/>
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

// ─── Main ───────────────────────────────────────────────────────────────────────
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
      .catch(()=>toast.error("Erreur de chargement")).finally(()=>setLoading(false));
  },[]);

  async function handleToggleTask(id:string) {
    const n=new Set(completedIds); const was=n.has(id);
    if(!was) n.add(id); else n.delete(id); setCompletedIds(n);
    await fetch(`/api/tasks/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({completed:!was})});
    if(!was&&Array.from(n).length===tasks.length) toast.success("Toutes les tâches complétées 🎉");
  }
  async function handleDeleteTask(id:string) {
    setTasks(p=>p.filter(t=>t.id!==id));
    await fetch(`/api/tasks/${id}`,{method:"DELETE"});
  }
  async function handleAddTask(title:string, priority:string) {
    const res=await fetch("/api/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,priority,scope:"DAY",dueDate:new Date().toISOString().split("T")[0]})});
    if(res.ok){ const task=await res.json(); setTasks(p=>[...p,{id:task.id,title:task.title,priority:task.priority,scope:task.scope}]); toast.success("Tâche ajoutée !"); }
  }

  if(loading) return <DashboardSkeleton/>;

  const dateStr = format(new Date(),"EEEE d MMMM",{locale:fr}).toUpperCase();
  const workout = data?.todayWorkout??data?.lastWorkout;
  const sessionBadge = workout?.sessionLabel ? SESSION_BADGE[workout.sessionLabel]??"badge-other" : "badge-other";
  const sessionName  = workout?.sessionLabel ? SESSION_LABELS[workout.sessionLabel] : "SESSION";
  const visibleTasks = tasks.filter(t=>!completedIds.has(t.id)).slice(0,4);
  const sportPct = sportsGoal>0 ? (data?.weekSessions??0)/sportsGoal*100 : 0;
  const calPct = calorieGoal>0&&data?.avgCalories7d ? data.avgCalories7d/calorieGoal*100 : 0;
  const weightDiff = data?.latestWeight?.previousValue!=null ? data.latestWeight!.value-data.latestWeight!.previousValue! : null;
  const sleepScore = data?.lastSleep?.score??null;
  const weightChartData = (data?.weightHistory??[]).map(d=>({ date:format(parseISO(d.date),"d MMM",{locale:fr}), Poids:d.value, Tendance:d.ma }));

  return (
    <div style={{ padding:"0 20px",display:"flex",flexDirection:"column",gap:20 }}>

      {/* HEADER */}
      <div className="blur-slide-up" style={{ paddingTop:60 }}>
        <div className="flex items-start justify-between" style={{ marginBottom:4 }}>
          <div>
            <p style={{ fontFamily:"var(--font-space)",fontSize:10,fontWeight:600,letterSpacing:"0.2em",textTransform:"uppercase",color:W30,marginBottom:8 }}>AUJOURD'HUI</p>
            <GlitchText as="h1" style={{ fontFamily:"var(--font-orbitron)",fontWeight:800,fontSize:48,letterSpacing:"0.05em",lineHeight:1,color:W100,display:"block" }}>
              {dateStr}
            </GlitchText>
            <TypewriterGreeting/>
          </div>
          <AvatarButton onClick={()=>router.push("/profil")}/>
        </div>
        <GradDiv/>
      </div>

      {/* HERO CARD */}
      <div className="blur-slide-up-1">
        <Card3D maxRotation={5} className="animated-border-card" style={{ borderRadius:20 }}>
          <div className="holo-card holo-card-hero carbon" style={{ borderRadius:20,padding:22,position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",top:12,right:12,opacity:0.55,zIndex:1 }}>
              <RadarPulse size={88}/>
            </div>
            {workout ? (
              <>
                <div className="flex items-center justify-between" style={{ marginBottom:14,paddingRight:88 }}>
                  <span className={`badge-ppl ${sessionBadge}`}>{workout.sessionLabel??workout.type}</span>
                  <span style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:600,letterSpacing:"0.1em",color:data?.todayWorkout?W100:W30 }}>
                    {data?.todayWorkout?"● SÉANCE DU JOUR":"DERNIÈRE SÉANCE"}
                  </span>
                </div>
                <GlitchText as="p" style={{ fontFamily:"var(--font-orbitron)",fontWeight:800,fontSize:36,letterSpacing:"0.02em",color:W100,lineHeight:1,marginBottom:4,display:"block" }}>
                  {sessionName}
                </GlitchText>
                <p style={{ fontFamily:"var(--font-space)",color:W30,fontSize:13,marginBottom:20 }}>
                  {workout.type==="STRENGTH"?"Musculation":"Cardio"}
                </p>

                {/* Stats */}
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderTop:`1px solid ${W08}`,paddingTop:16 }}>
                  {[
                    {icon:<Clock size={12}/>,label:"DURÉE",value:`${workout.duration}`,unit:"min"},
                    {icon:<Dumbbell size={12}/>,label:workout.distanceKm?"DISTANCE":"EXERCICES",value:workout.distanceKm?`${workout.distanceKm}`:`${workout.exerciseCount}`,unit:workout.distanceKm?"km":"ex."},
                    {icon:<TrendingUp size={12}/>,label:"VOLUME",value:workout.totalVolume>0?`${(workout.totalVolume/1000).toFixed(1)}`:"—",unit:workout.totalVolume>0?"t":""},
                  ].map((s,i)=>(
                    <div key={i} style={{ padding:"0 12px",borderLeft:i>0?`1px solid ${W08}`:"none",textAlign:i===0?"left":i===1?"center":"right" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:4,justifyContent:i===2?"flex-end":i===1?"center":"flex-start",color:W30,marginBottom:6 }}>
                        {s.icon}
                        <span style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:600,letterSpacing:"0.12em",color:W30 }}>{s.label}</span>
                      </div>
                      <p style={{ fontFamily:"var(--font-orbitron)",fontWeight:700,fontSize:20,color:W100,lineHeight:1,fontVariantNumeric:"tabular-nums" }}>
                        <DataStreamNumber value={s.value} delay={400+i*100} duration={700}/>
                        <span style={{ fontFamily:"var(--font-space)",fontSize:11,fontWeight:400,color:W30,marginLeft:2 }}>{s.unit}</span>
                      </p>
                    </div>
                  ))}
                </div>

                {/* Weekly */}
                <div style={{ marginTop:16,paddingTop:14,borderTop:`1px solid ${W08}` }}>
                  <div className="flex justify-between" style={{ marginBottom:8 }}>
                    <span style={{ fontFamily:"var(--font-space)",fontSize:10,color:W30 }}>{data?.weekSessions??0}/{sportsGoal} séances · semaine</span>
                    <span style={{ fontFamily:"var(--font-orbitron)",fontWeight:700,fontSize:10,color:W70,fontVariantNumeric:"tabular-nums" }}>{Math.round(sportPct)}%</span>
                  </div>
                  <BeamProgress value={data?.weekSessions??0} max={sportsGoal}/>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center" style={{ padding:"28px 0",gap:16 }}>
                <div style={{ width:64,height:64,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:`1px solid ${W15}`,display:"flex",alignItems:"center",justifyContent:"center",animation:"fabPulse 2s ease-in-out infinite" }}>
                  <Dumbbell size={28} style={{ color:W70 }}/>
                </div>
                <p style={{ fontFamily:"var(--font-orbitron)",fontWeight:700,fontSize:18,color:W30,letterSpacing:"0.02em" }}>Aucune séance</p>
                <motion.button whileTap={{scale:0.96}} onClick={()=>router.push("/sport?modal=true")} className="shimmer-btn"
                  style={{ background:W100,color:"#000",padding:"13px 24px",borderRadius:12,fontFamily:"var(--font-space)",fontWeight:700,fontSize:13,letterSpacing:"0.06em",boxShadow:"0 4px 24px rgba(255,255,255,0.15)",border:"none",cursor:"pointer" }}>
                  Enregistrer une séance →
                </motion.button>
              </div>
            )}
          </div>
        </Card3D>
      </div>

      {/* MÉTRIQUES 2×2 */}
      <motion.div className="blur-slide-up-2" variants={staggerContainer} initial="initial" animate="animate">
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          <MetricCard label="POIDS" value={data?.latestWeight?.value??null} unit="kg" change={weightDiff} decimals={1}/>
          <div>
            <div className="holo-card" style={{ height:110,padding:16,display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
              <p style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:600,letterSpacing:"0.2em",textTransform:"uppercase",color:W30 }}>CALORIES</p>
              <p style={{ fontFamily:"var(--font-orbitron)",fontWeight:800,fontSize:38,lineHeight:1,color:W100,fontVariantNumeric:"tabular-nums" }}>
                {data?.todayCalories
                  ? <DataStreamNumber value={data.todayCalories.calories} delay={150} duration={900}/>
                  : <span style={{ opacity:0.2 }}>—</span>}
                <span style={{ fontFamily:"var(--font-space)",fontSize:13,fontWeight:400,color:W30,marginLeft:4 }}>kcal</span>
              </p>
              {data?.todayCalories&&<BeamProgress value={data.todayCalories.calories} max={calorieGoal} height={2}/>}
            </div>
          </div>
          <div>
            <div className="holo-card" style={{ height:110,padding:16,display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
              <p style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:600,letterSpacing:"0.2em",textTransform:"uppercase",color:W30 }}>SOMMEIL</p>
              <div>
                <p style={{ fontFamily:"var(--font-orbitron)",fontWeight:800,fontSize:38,lineHeight:1,color:W100,fontVariantNumeric:"tabular-nums" }}>
                  {data?.lastSleep
                    ? <DataStreamNumber value={data.lastSleep.duration.toFixed(1)} delay={250} duration={900}/>
                    : <span style={{ opacity:0.2 }}>—</span>}
                  <span style={{ fontFamily:"var(--font-space)",fontSize:13,fontWeight:400,color:W30,marginLeft:4 }}>h</span>
                </p>
                {sleepScore!=null&&(
                  <span style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:600,background:"rgba(255,255,255,0.08)",color:W70,padding:"2px 7px",borderRadius:999 }}>
                    SCORE {sleepScore}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div>
            <div className="holo-card" style={{ height:110,padding:16,display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
              <p style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:600,letterSpacing:"0.2em",textTransform:"uppercase",color:W30 }}>PATRIMOINE</p>
              <div>
                <p style={{ fontFamily:"var(--font-space)",fontWeight:700,fontSize:17,color:W100,fontVariantNumeric:"tabular-nums" }}>
                  {data?.totalPatrimoine ? fmtEuro(data.totalPatrimoine.value) : "—"}
                </p>
                {data?.totalPatrimoine?.change7d!=null&&(
                  <div style={{ display:"flex",alignItems:"center",gap:3,marginTop:4 }}>
                    <span style={{ fontFamily:"var(--font-space)",fontSize:10,fontWeight:600,fontVariantNumeric:"tabular-nums",color:data.totalPatrimoine.change7d>0?W100:W50 }}>
                      {data.totalPatrimoine.change7d>0?"+":""}{fmtEuro(data.totalPatrimoine.change7d)} /7j
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* OBJECTIFS */}
      <div className="blur-slide-up-3">
        <div className="holo-card" style={{ borderRadius:20,padding:20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom:4 }}>
            <h2 style={{ fontFamily:"var(--font-orbitron)",fontWeight:800,fontSize:24,letterSpacing:"0.02em",color:W100 }}>Objectifs</h2>
            <motion.button whileTap={{scale:0.95}} onClick={()=>router.push("/profil")} style={{ fontFamily:"var(--font-space)",color:W50,fontSize:13,fontWeight:500,background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:3,minHeight:44 }}>
              Régler <ChevronRight size={13}/>
            </motion.button>
          </div>
          <GradDiv/>
          <div style={{ display:"flex",flexDirection:"column",gap:18 }}>
            {[
              {icon:<Zap size={14} style={{ color:W70 }}/>,label:"Sessions cette semaine",current:data?.weekSessions??0,max:sportsGoal,unit:`${data?.weekSessions??0}/${sportsGoal}`},
              {icon:<Flame size={14} style={{ color:W70 }}/>,label:"Calories moy. 7j",current:data?.avgCalories7d??0,max:calorieGoal,unit:`${data?.avgCalories7d??0} / ${calorieGoal} kcal`},
              ...(weightGoal&&data?.latestWeight ? [{icon:<Target size={14} style={{ color:W70 }}/>,label:"Objectif poids",current:Math.max(0,100-Math.abs(data.latestWeight.value-weightGoal)/Math.max(data.latestWeight.value,weightGoal)*100),max:100,unit:`${data.latestWeight.value} → ${weightGoal} kg`}] : []),
            ].map((g,i)=>(
              <div key={i}>
                <div className="flex justify-between items-center" style={{ marginBottom:8 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>{g.icon}<span style={{ fontFamily:"var(--font-space)",fontSize:13,fontWeight:600,color:W70 }}>{g.label}</span></div>
                  <span style={{ fontFamily:"var(--font-space)",fontWeight:700,fontSize:12,color:W100,fontVariantNumeric:"tabular-nums" }}>{g.unit}</span>
                </div>
                <BeamProgress value={g.current} max={g.max}/>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TÂCHES */}
      <div className="blur-slide-up-4">
        <div className="holo-card" style={{ borderRadius:20,padding:20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom:4 }}>
            <h2 style={{ fontFamily:"var(--font-orbitron)",fontWeight:800,fontSize:24,letterSpacing:"0.02em",color:W100 }}>À faire</h2>
            <motion.span initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",delay:0.6,stiffness:500,damping:25}}
              style={{ fontFamily:"var(--font-space)",background:"rgba(255,255,255,0.08)",color:W70,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:999 }}>
              {visibleTasks.length}
            </motion.span>
          </div>
          <GradDiv/>
          {visibleTasks.length===0 ? (
            <p style={{ fontFamily:"var(--font-space)",color:W30,fontSize:14,textAlign:"center",padding:"20px 0" }}>Toutes les tâches complétées 🎉</p>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              <AnimatePresence initial={false}>
                {visibleTasks.map((task,i)=>{
                  const p=PRIORITY_STYLE[task.priority]; const done=completedIds.has(task.id);
                  return (
                    <motion.div key={task.id} layout initial={{opacity:0,x:-12}} animate={{opacity:done?0.3:1,x:0}} exit={{opacity:0,height:0}}
                      transition={{...SPRING_STANDARD,delay:i*0.05}}
                      style={{ display:"flex",alignItems:"center",gap:12,background:"rgba(255,255,255,0.03)",border:`1px solid ${W08}`,borderRadius:12,padding:"12px 14px",position:"relative",overflow:"hidden" }}>
                      <div style={{ position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:22,borderRadius:"0 2px 2px 0",background:p.indicator }}/>
                      <motion.button whileTap={{scale:0.8}} onClick={()=>handleToggleTask(task.id)} style={{ flexShrink:0,marginLeft:4,background:"none",border:"none",cursor:"pointer",minWidth:28,minHeight:28 }}>
                        {done?<CheckCircle2 size={20} style={{ color:W100 }}/>:<Circle size={20} style={{ color:W30 }}/>}
                      </motion.button>
                      <p style={{ flex:1,fontFamily:"var(--font-space)",fontSize:14,fontWeight:500,color:done?W30:W100,textDecoration:done?"line-through":"none",transition:"all 0.25s" }}>{task.title}</p>
                      <span style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:700,background:p.bg,color:p.text,padding:"3px 7px",borderRadius:6,letterSpacing:"0.08em",textTransform:"uppercase" as const }}>{p.label}</span>
                      <motion.button whileTap={{scale:0.8}} onClick={()=>handleDeleteTask(task.id)} style={{ color:W15,flexShrink:0,background:"none",border:"none",cursor:"pointer",minWidth:28,minHeight:28 }}>
                        <Trash2 size={13}/>
                      </motion.button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
          <motion.button whileTap={{scale:0.95}} onClick={()=>setAddTaskOpen(true)}
            style={{ display:"flex",alignItems:"center",gap:6,fontFamily:"var(--font-space)",color:W50,fontSize:13,fontWeight:600,marginTop:16,background:"none",border:"none",cursor:"pointer",minHeight:44 }}>
            <Plus size={14}/> Ajouter une tâche
          </motion.button>
        </div>
      </div>

      {/* GRAPHIQUE */}
      <div className="blur-slide-up-5">
        <div className="holo-card" style={{ borderRadius:20,padding:20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom:4 }}>
            <h2 style={{ fontFamily:"var(--font-orbitron)",fontWeight:800,fontSize:22,letterSpacing:"0.02em",color:W100 }}>Évolution</h2>
            <span style={{ fontFamily:"var(--font-space)",fontSize:9,fontWeight:600,letterSpacing:"0.1em",background:"rgba(255,255,255,0.05)",color:W30,padding:"4px 10px",borderRadius:8 }}>30 JOURS</span>
          </div>
          <GradDiv/>
          {weightChartData.length>0 ? (
            <div style={{ position:"relative" }}>
              <ResponsiveContainer width="100%" height={165}>
                <AreaChart data={weightChartData} margin={{top:5,right:5,bottom:0,left:-30}}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.18}/>
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)"/>
                  <XAxis dataKey="date" tick={{fill:"rgba(255,255,255,0.3)",fontSize:10,fontFamily:"var(--font-space)"}} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                  <Tooltip content={<ChartTooltip/>} cursor={{stroke:"rgba(255,255,255,0.2)",strokeWidth:1,strokeDasharray:"4 4"}}/>
                  <Area type="monotone" dataKey="Poids" stroke="#FFFFFF" strokeWidth={2} fill="url(#wGrad)" dot={false} activeDot={{r:5,fill:"#fff",stroke:"#fff",strokeWidth:0}}/>
                  <Line type="monotone" dataKey="Tendance" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} strokeDasharray="6 3" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
              <div className="scanlines" aria-hidden style={{ position:"absolute",inset:0,borderRadius:12,pointerEvents:"none",opacity:0.4 }}/>
            </div>
          ) : (
            <div style={{ height:120,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-space)",color:W15,fontSize:13 }}>Aucune donnée</div>
          )}
          <div style={{ display:"flex",gap:16,marginTop:12 }}>
            {[["Poids","#FFFFFF",false],["Tendance 7j","rgba(255,255,255,0.4)",true]].map(([l,c,d])=>(
              <div key={l as string} style={{ display:"flex",alignItems:"center",gap:6 }}>
                <div style={{ width:14,height:2,borderRadius:1,background:c as string }}/>
                <span style={{ fontFamily:"var(--font-space)",fontSize:9,color:W30 }}>{l as string}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AddTaskSheet open={addTaskOpen} onClose={()=>setAddTaskOpen(false)} onAdd={handleAddTask}/>
    </div>
  );
}
