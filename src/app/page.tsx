
"use client";
import{useEffect,useRef,useState,useCallback}from"react";
import{DOOR_CONFIG}from"@/lib/studio-engine";
import{startAmbient,playRoomEnter,startGameMusic,stopGameMusic}from"@/lib/sound";

// ── TICKER HEADLINES (doomsday news) ──
const TICKER_ITEMS=[
  "BREAKING: AI eliminates 80% of white-collar jobs globally",
  "REUTERS: Last human stockbroker retires — AI now runs all trading",
  "BBC: UN declares 'Civilisational Transition' — adapt or be left behind",
  "WIRED: Creative agencies mass-closing — 'We have no clients left'",
  "FORTUNE: Only brands that embraced AI survived the transition",
  "THE GUARDIAN: Education system implodes as AI tutors replace 2M teachers",
  "BLOOMBERG: AI-native companies grew 3x — the rest are gone",
  "LEAKED MEMO: All creative roles eliminated by Q1 2026",
  "DER SPIEGEL: Die Maschinen haben gewonnen — The machines have won",
  "@TechCrash: bro I just got replaced by a $20/month subscription 💀",
];

type Phase="corridor"|"preview"|"inside";

export default function Home(){
  const corridorCanvas=useRef<HTMLCanvasElement>(null);
  const roomCanvas=useRef<HTMLCanvasElement>(null);
  const corridorEng=useRef<any>(null);
  const roomEng=useRef<any>(null);

  const [entered,setEntered]=useState(false);
  const [loading,setLoading]=useState(false);
  const [phase,setPhase]=useState<Phase>("corridor");
  const [activeRoom,setActiveRoom]=useState<string|null>(null);
  const previewTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [cursorPos,setCursorPos]=useState({x:-100,y:-100});
  const [secretScore,setSecretScore]=useState(0);
  const [secretUnlocked,setSecretUnlocked]=useState(false);
  const [newsletterEmail,setNewsletterEmail]=useState("");
  const [newsletterSubmitted,setNewsletterSubmitted]=useState(false);
  const [gameIntroShown,setGameIntroShown]=useState(false);
  // AI Chat state
  const [aiChatOpen,setAiChatOpen]=useState(false);
  const [aiMessages,setAiMessages]=useState<{from:string,text:string}[]>([]);
  const [aiInput,setAiInput]=useState("");
  const aiGreeted=useRef(false);
  const aiSpeaking=useRef(false);

  // AI Voice — Web Speech API with consistent voice
  const aiVoiceRef=useRef<SpeechSynthesisVoice|null>(null);
  const speakAI=(text:string)=>{
    if(aiSpeaking.current||typeof window==="undefined")return;
    aiSpeaking.current=true;
    const synth=window.speechSynthesis;synth.cancel();
    const utter=new SpeechSynthesisUtterance(text);
    utter.rate=0.88;utter.pitch=0.3;utter.volume=0.75;
    // Use cached voice or find one
    if(!aiVoiceRef.current){
      const voices=synth.getVoices();
      aiVoiceRef.current=voices.find(v=>v.name.includes("Google UK English Male"))||voices.find(v=>v.lang.startsWith("en")&&v.name.toLowerCase().includes("male"))||voices.find(v=>v.lang==="en-US")||voices[0]||null;
    }
    if(aiVoiceRef.current)utter.voice=aiVoiceRef.current;
    utter.onend=()=>{aiSpeaking.current=false;};
    utter.onerror=()=>{aiSpeaking.current=false;};
    synth.speak(utter);
    if(corridorEng.current?.updateAIBubble)corridorEng.current.updateAIBubble(text);
  };
  // Preload voices on mount
  useEffect(()=>{
    if(typeof window==="undefined")return;
    const loadVoices=()=>{const voices=window.speechSynthesis.getVoices();
      aiVoiceRef.current=voices.find(v=>v.name.includes("Google UK English Male"))||voices.find(v=>v.lang.startsWith("en")&&v.name.toLowerCase().includes("male"))||voices.find(v=>v.lang==="en-US")||voices[0]||null;};
    loadVoices();window.speechSynthesis.onvoiceschanged=loadVoices;
  },[]);

  // AI greeting phrases
  const AI_GREETINGS=["Welcome, human. I am the Fleming AI. I guard this corridor and everything within it. What would you like to know about Fleming Studios?",
    "Ah, a visitor. I've been expecting you. Fleming Studios built me to guide brands through the chaos. Ask me anything — branding, AI, marketing, or the secrets of this place.",
    "You've come to the right place. The world may have ended, but Fleming Studios is just getting started. What can I tell you?"];

  const handleAIResponse=(input:string)=>{
    const l=input.toLowerCase();
    let r="";
    // Greetings
    if(/^(hi|hey|hello|sup|yo|howdy|greetings|good|morning|evening)/i.test(l))r="Hello there! I'm the Fleming AI — guardian of this corridor. I can tell you about branding, websites, campaigns, AI production, pricing, or the secret room. What interests you?";
    // Email / contact info
    else if(l.includes("email")||l.includes("mail")||l.includes("address")||l.includes("contact")||l.includes("reach")||l.includes("get in touch")||l.includes("hire")||l.includes("work with")||l.includes("book"))r="You can reach Fleming Studios at hello@flemingstudios.eu — or visit flemingstudios.eu to book a free consultation. We usually respond within 24 hours. You can also shoot 10 flamingos in the secret room to unlock a free AI Growth Report!";
    // Social media marketing pricing
    else if((l.includes("social media")||l.includes("social")||l.includes("instagram")||l.includes("tiktok")||l.includes("facebook")||l.includes("linkedin"))&&(l.includes("price")||l.includes("cost")||l.includes("how much")||l.includes("rate")||l.includes("package")||l.includes("pric")))r="Social media management starts from €1,500/month for a single platform, including content creation, scheduling, and analytics. Multi-platform packages with paid ad management start from €3,000/month. Every brand is different — email hello@flemingstudios.eu for a tailored quote.";
    // Branding pricing
    else if((l.includes("brand")||l.includes("logo")||l.includes("identity"))&&(l.includes("price")||l.includes("cost")||l.includes("how much")||l.includes("rate")||l.includes("pric")))r="Brand identity packages start from €2,500 for startups (logo, colour palette, basic guidelines) up to €15,000+ for full brand systems including brand book, stationery, digital templates, and brand strategy. Email hello@flemingstudios.eu for a custom quote.";
    // Website pricing
    else if((l.includes("website")||l.includes("web")||l.includes("site")||l.includes("app"))&&(l.includes("price")||l.includes("cost")||l.includes("how much")||l.includes("rate")||l.includes("pric")))r="Websites range from €3,000 for a conversion-optimised landing page to €15,000+ for full e-commerce or web applications. All include responsive design, SEO setup, and performance optimisation. Reach out at hello@flemingstudios.eu for a project-specific estimate.";
    // Campaign pricing
    else if((l.includes("campaign")||l.includes("advertis")||l.includes("ads")||l.includes("growth"))&&(l.includes("price")||l.includes("cost")||l.includes("how much")||l.includes("rate")||l.includes("pric")))r="Growth campaigns start from €2,000/month including strategy, creative production, A/B testing, and performance reporting. Larger campaigns with multi-channel activation run €5,000-€20,000/month depending on scope and ad spend. Contact hello@flemingstudios.eu to discuss.";
    // AI pricing
    else if(l.includes("ai")&&(l.includes("price")||l.includes("cost")||l.includes("how much")||l.includes("rate")||l.includes("pric")))r="AI production services are project-based, starting from €5,000 for AI-powered content pipelines up to €50,000+ for full AI integration into your creative workflow. We'll build a custom proposal — email hello@flemingstudios.eu.";
    // General pricing
    else if(l.includes("price")||l.includes("cost")||l.includes("how much")||l.includes("rate")||l.includes("pric")||l.includes("quote")||l.includes("budget")||l.includes("expensive")||l.includes("cheap")||l.includes("afford"))r="Pricing depends on what you need. Branding starts from €2,500, websites from €3,000, social media from €1,500/month, campaigns from €2,000/month, and AI production from €5,000. Email hello@flemingstudios.eu for a tailored proposal — or shoot 10 flamingos for a free AI Growth Report!";
    // Identity
    else if(l.includes("who are you")||l.includes("what are you")||l.includes("your name"))r="I am the Fleming AI — a digital entity forged by Fleming Studios. I exist in the data streams between these walls. I was created to guide visitors, answer questions about our services, and protect the secrets of this corridor.";
    // Branding
    else if(l.includes("brand")||l.includes("logo")||l.includes("identity")||l.includes("visual"))r="Branding is our foundation. We build visual identity systems that command attention — logos, brand books, colour systems, typography, brand strategy. All powered by AI precision with human creativity. Step through the Branding door to see more.";
    // Websites
    else if(l.includes("website")||l.includes("web")||l.includes("digital")||l.includes("site")||l.includes("app"))r="We craft websites and digital experiences that convert visitors into clients. Fast loading, beautiful design, ruthlessly optimised for performance. From landing pages to full web apps — every pixel serves a purpose.";
    // AI
    else if(l.includes("ai")||l.includes("artificial")||l.includes("intelligence")||l.includes("machine")||l.includes("automat"))r="AI Production is our superpower. We use cutting-edge artificial intelligence to scale creative output tenfold — without losing quality. From AI-generated campaigns to automated brand assets, we're building the future of marketing.";
    // Social media / campaigns
    else if(l.includes("campaign")||l.includes("growth")||l.includes("market")||l.includes("advertis")||l.includes("ads")||l.includes("social")||l.includes("instagram")||l.includes("tiktok")||l.includes("facebook")||l.includes("linkedin"))r="Our growth campaigns are data-driven machines. We manage social media, run paid ads, test hundreds of creative variations, and scale what works across every channel. Whether it's Instagram, TikTok, LinkedIn, or Google — we've got it covered.";
    // Content
    else if(l.includes("content")||l.includes("video")||l.includes("photo")||l.includes("copy")||l.includes("creat")||l.includes("production"))r="Content production at scale and speed. Video, photography, copywriting, social media content — we produce more high-quality content in a week than most agencies deliver in a month. All accelerated by AI.";
    // Secret room
    else if(l.includes("secret")||l.includes("hidden")||l.includes("easter")||l.includes("surprise")||l.includes("mystery")||l.includes("portal"))r="The secret room? Walk to the very end of this corridor... look for the glowing portal. There's a flamingo hunt waiting — shoot 10 and you'll unlock a free AI Growth Optimisation Report for your business!";
    // Location
    else if(l.includes("where")||l.includes("location")||l.includes("office")||l.includes("based"))r="Fleming Studios operates globally with a digital-first approach. Our primary operations are in Europe. Visit flemingstudios.eu or email hello@flemingstudios.eu for any location-specific enquiries.";
    // Team
    else if(l.includes("team")||l.includes("people")||l.includes("who works")||l.includes("founder")||l.includes("ceo"))r="Fleming Studios is a lean, AI-augmented team of strategists, designers, developers, and creative technologists. We intentionally stay small to move fast and deliver exceptional quality. Learn more at flemingstudios.eu.";
    // About Fleming
    else if(l.includes("fleming")||l.includes("studio")||l.includes("company")||l.includes("about")||l.includes("who made"))r="Fleming Studios is a branding, marketing, and AI production agency. We help brands survive and thrive in the age of artificial intelligence. This corridor is a live showcase — explore the doors to see each capability in action.";
    // Doors / navigation
    else if(l.includes("door")||l.includes("room")||l.includes("explore")||l.includes("walk")||l.includes("navigate"))r="There are doors for Branding, Websites, Content, Campaigns, AI Production — plus a secret portal at the far end. Use the service buttons at the bottom of your screen to jump straight to any door, or walk with WASD!";
    // This place
    else if(l.includes("this place")||l.includes("corridor")||l.includes("here")||l.includes("where am i")||l.includes("what is this"))r="You're inside the Fleming Studios 3D experience. Walk with WASD, right-click to look around, approach glowing doors to enter rooms. Click the service names at the bottom to teleport. And don't miss the secret portal at the end!";
    // Thanks
    else if(l.includes("thank")||l.includes("cheers")||l.includes("nice")||l.includes("cool")||l.includes("awesome")||l.includes("great")||l.includes("amazing"))r="Glad I could help! If you need anything else, I'm always here. Now go explore — and remember, the secret portal holds a special reward.";
    // Help
    else if(l.includes("help")||l.includes("what can")||l.includes("how do")||l.includes("how to")||l.includes("what do you"))r="I can help with: service info (branding, websites, campaigns, AI), pricing and packages, contact details (hello@flemingstudios.eu), navigation tips, and the secret room. Just ask naturally — I understand context!";
    // Jokes
    else if(l.includes("joke")||l.includes("funny")||l.includes("laugh"))r="Why did the brand cross the road? Because Fleming Studios optimised its path to conversion. I know, I know — I'm an AI, not a comedian. But our campaigns? Those are killer.";
    // Competitors
    else if(l.includes("compet")||l.includes("other agenc")||l.includes("better")||l.includes("compare"))r="I'm programmed with a healthy bias, but Fleming Studios' edge is real: AI-native workflows let us deliver faster, at higher quality, for a fraction of traditional agency costs. But don't take my word for it — explore the corridor and see for yourself.";
    // Fallback — smart contextual
    else {
      const words=l.split(/\s+/);
      if(words.length<=3)r="I'd love to help with that! Could you give me a bit more detail? I know all about Fleming Studios' services, pricing, team, and this experience. Try something like 'How much does a website cost?' or 'What's your email?'";
      else {const fb=["That's a great question. While I don't have a specific answer for that, I'd recommend reaching out to the team at hello@flemingstudios.eu — they'll get back to you within 24 hours.",
        "Hmm, that's outside my core knowledge. I specialise in Fleming Studios services and pricing. For anything specific, email hello@flemingstudios.eu or explore the doors in this corridor!",
        "Interesting question! I'm best at helping with branding, websites, campaigns, AI production, and pricing. For anything else, the team at hello@flemingstudios.eu can help.",
        "I wish I had a better answer for that! My expertise is Fleming Studios services. Try asking about pricing, services, or the secret room — or email hello@flemingstudios.eu for custom enquiries."];
      r=fb[Math.floor(Math.random()*fb.length)];}
    }
    setTimeout(()=>{
      setAiMessages(prev=>[...prev,{from:"ai",text:r}]);
      speakAI(r);
    },600);
  };

  // AI proximity callback
  const handleAINear=useCallback((near:boolean)=>{
    if(near&&!aiGreeted.current){
      aiGreeted.current=true;
      const greeting=AI_GREETINGS[Math.floor(Math.random()*AI_GREETINGS.length)];
      setAiMessages([{from:"ai",text:greeting}]);
      setAiChatOpen(true);
      // Slight delay so voices are loaded
      setTimeout(()=>speakAI(greeting),300);
    }
    if(!near){setAiChatOpen(false);}
    if(near&&aiGreeted.current){setAiChatOpen(true);}
  },[]);

  // Cursor
  useEffect(()=>{
    const mv=(e:MouseEvent)=>setCursorPos({x:e.clientX,y:e.clientY});
    window.addEventListener("mousemove",mv);return()=>window.removeEventListener("mousemove",mv);
  },[]);

  // Engine door callback — fires when player walks near a door
  const handleDoorNear=useCallback((room:string|null,hex:string)=>{
    if(room===null){
      // Player walked away — cancel preview and go back to corridor
      if(previewTimer.current){clearTimeout(previewTimer.current);previewTimer.current=null;}
      setPhase(prev=>prev==="preview"?"corridor":prev);
      if(!previewTimer.current)setActiveRoom(prev=>{
        // Only clear if we're in preview, not if already inside a room
        return prev;
      });
      return;
    }
    setActiveRoom(room);
    setPhase("preview");
    playRoomEnter();
    // Auto-enter room after 2s
    if(previewTimer.current)clearTimeout(previewTimer.current);
    previewTimer.current=setTimeout(()=>{
      setPhase("inside");
    },2000);
  },[]);

  // Start corridor engine
  useEffect(()=>{
    if(!entered||!corridorCanvas.current)return;
    let eng:any;
    import("@/lib/studio-engine").then(({StudioEngine})=>{
      eng=new StudioEngine(corridorCanvas.current!,handleDoorNear,handleAINear);
      eng.start();corridorEng.current=eng;startAmbient();
    });
    return()=>{if(eng)eng.dispose();};
  },[entered,handleDoorNear,handleAINear]);

  // Start room engine when inside a room
  useEffect(()=>{
    if(phase!=="inside"||!activeRoom||!roomCanvas.current)return;
    let eng:any;
    if(activeRoom==="branding"){
      import("@/lib/branding-room").then(({BrandingRoom})=>{
        eng=new BrandingRoom(roomCanvas.current!);eng.start();roomEng.current=eng;
      });
    }
    if(activeRoom==="secret"){
      import("@/lib/secret-room").then(({SecretRoom})=>{
        eng=new SecretRoom(roomCanvas.current!);
        eng.onScoreChange=(s:number)=>setSecretScore(s);
        eng.onUnlock=()=>setSecretUnlocked(true);
        eng.start();roomEng.current=eng;
        startGameMusic();
        setGameIntroShown(true);setTimeout(()=>setGameIntroShown(false),4500);
      });
    }
    // Future rooms: websites, content, campaigns, ai — placeholder for now
    return()=>{if(eng){eng.dispose();roomEng.current=null;}};
  },[phase,activeRoom]);

  const enter=()=>{setLoading(true);setTimeout(()=>{setEntered(true);setLoading(false);},500);};

  const exitRoom=()=>{
    if(previewTimer.current){clearTimeout(previewTimer.current);previewTimer.current=null;}
    if(roomEng.current){roomEng.current.dispose();roomEng.current=null;}
    // Reset corridor engine door state so door can re-trigger
    if(corridorEng.current){corridorEng.current.nearDoor=null;}
    stopGameMusic();
    setPhase("corridor");
    setActiveRoom(null);
    setSecretScore(0);
    setSecretUnlocked(false);
    setNewsletterEmail("");
    setNewsletterSubmitted(false);
    setGameIntroShown(false);
  };

  const roomData=activeRoom?DOOR_CONFIG.find(d=>d.room===activeRoom):null;
  const inRoom=phase==="inside";
  const inPreview=phase==="preview";

  return(
    <>
      {/* Custom cursor — corridor: bright crosshair */}
      {(!inRoom||activeRoom!=="secret")&&(
        <div style={{position:"fixed",left:cursorPos.x,top:cursorPos.y,zIndex:9999,pointerEvents:"none",transform:"translate(-50%,-50%)",userSelect:"none"}}>
          <div style={{width:28,height:28,position:"relative"}}>
            <div style={{position:"absolute",top:13,left:0,width:10,height:2,background:"#00D4FF",boxShadow:"0 0 6px #00D4FF"}}/>
            <div style={{position:"absolute",top:13,right:0,width:10,height:2,background:"#00D4FF",boxShadow:"0 0 6px #00D4FF"}}/>
            <div style={{position:"absolute",left:13,top:0,width:2,height:10,background:"#00D4FF",boxShadow:"0 0 6px #00D4FF"}}/>
            <div style={{position:"absolute",left:13,bottom:0,width:2,height:10,background:"#00D4FF",boxShadow:"0 0 6px #00D4FF"}}/>
            <div style={{position:"absolute",top:11,left:11,width:6,height:6,borderRadius:"50%",background:"#00D4FF",boxShadow:"0 0 12px #00D4FF"}}/>
          </div>
        </div>
      )}
      {/* Mini-game cursor: orange target */}
      {inRoom&&activeRoom==="secret"&&(
        <div style={{position:"fixed",left:cursorPos.x,top:cursorPos.y,zIndex:9999,pointerEvents:"none",transform:"translate(-50%,-50%)",userSelect:"none"}}>
          <div style={{width:40,height:40,position:"relative"}}>
            <div style={{position:"absolute",inset:4,border:"2px solid #FFA500",borderRadius:"50%",boxShadow:"0 0 14px #FFA50088, inset 0 0 8px #FFA50044"}}/>
            <div style={{position:"absolute",top:19,left:0,width:14,height:2,background:"#FFA500",boxShadow:"0 0 6px #FFA500"}}/>
            <div style={{position:"absolute",top:19,right:0,width:14,height:2,background:"#FFA500",boxShadow:"0 0 6px #FFA500"}}/>
            <div style={{position:"absolute",left:19,top:0,width:2,height:14,background:"#FFA500",boxShadow:"0 0 6px #FFA500"}}/>
            <div style={{position:"absolute",left:19,bottom:0,width:2,height:14,background:"#FFA500",boxShadow:"0 0 6px #FFA500"}}/>
            <div style={{position:"absolute",top:17,left:17,width:6,height:6,borderRadius:"50%",background:"#FFA500"}}/>
          </div>
        </div>
      )}

      {/* Corridor canvas — always mounted once entered */}
      <canvas ref={corridorCanvas} style={{position:"fixed",inset:0,width:"100vw",height:"100vh",display:entered&&!inRoom?"block":"none"}}/>

      {/* Room canvas — shown only when inside */}
      <canvas ref={roomCanvas} style={{position:"fixed",inset:0,width:"100vw",height:"100vh",display:inRoom?"block":"none"}}/>

      {/* ── ENTRY — Cinematic Sequence ── */}
      {!entered&&(
        <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",background:"#000205",overflow:"hidden"}}>
          {/* Ambient glow — copper tint */}
          <div style={{position:"absolute",width:"60vw",height:"60vw",borderRadius:"50%",
            background:"radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)",
            top:"50%",left:"50%",transform:"translate(-50%,-50%)",animation:"pulse 4s ease-in-out infinite"}}/>
          {/* Line 1 — faster: 0.2s start */}
          <h1 style={{fontSize:"clamp(36px,6vw,90px)",fontWeight:900,color:"#F5F1E8",
                      textAlign:"center",lineHeight:1.1,letterSpacing:"0.06em",textTransform:"uppercase",
                      marginBottom:"clamp(30px,5vh,60px)",
                      animation:"introLine1 1.2s ease 0.2s both",position:"relative",zIndex:2}}>
            THE WORLD AS WE KNOW IT<br/>HAS ENDED
          </h1>
          {/* Line 2 — cyan blue, more whitespace */}
          <h1 style={{fontSize:"clamp(36px,6vw,90px)",fontWeight:900,color:"#00D4FF",
                      textAlign:"center",lineHeight:1.1,
                      letterSpacing:"0.06em",textTransform:"uppercase",
                      textShadow:"0 0 80px #00D4FF44, 0 0 160px #00D4FF22",
                      marginBottom:"clamp(30px,5vh,60px)",
                      animation:"introLine2 1.2s ease 1.8s both",position:"relative",zIndex:2}}>
            BUT YOUR BRAND DIDN'T
          </h1>
          {/* Logo image — faster: 3.2s */}
          <div style={{marginBottom:16,animation:"introLogo 1s ease 3.2s both",position:"relative",zIndex:2}}>
            <img src="/logo.png" alt="Fleming Studios" style={{width:"clamp(200px,30vw,400px)",height:"auto"}}/>
          </div>
          {/* Rotating service titles — faster: 4.5s */}
          <div style={{height:"clamp(24px,3.5vh,36px)",marginBottom:"clamp(24px,4vh,48px)",overflow:"hidden",
            animation:"fadeIn 0.8s ease 4.5s both",position:"relative",zIndex:2}}>
            <div style={{animation:"cycleServices 8s steps(1) 4.5s both infinite",display:"flex",flexDirection:"column",alignItems:"center"}}>
              {[{t:"BRANDING & IDENTITY",c:"rgba(0,212,255,.6)"},{t:"MARKETING & CAMPAIGNS",c:"rgba(139,92,246,.6)"},{t:"GROWTH CAMPAIGNS",c:"rgba(255,184,0,.6)"},{t:"AI PRODUCTION",c:"rgba(0,229,176,.6)"}].map((s,i)=>(
                <p key={i} style={{height:"clamp(24px,3.5vh,36px)",display:"flex",alignItems:"center",
                  fontSize:"clamp(12px,1.5vw,18px)",letterSpacing:"0.55em",color:s.c,fontWeight:600}}>{s.t}</p>
              ))}
            </div>
          </div>
          {/* Button — copper, faster: 6s */}
          <button onClick={enter} disabled={loading}
            style={{padding:"clamp(16px,2.5vh,24px) clamp(52px,8vw,100px)",
                    border:"1.5px solid rgba(0,212,255,.6)",color:"#00D4FF",background:"transparent",
                    fontSize:"clamp(12px,1.4vw,18px)",letterSpacing:"0.55em",textTransform:"uppercase",
                    cursor:"none",fontFamily:"inherit",transition:"all .4s",animation:"fadeUp .9s ease 6s both",
                    position:"relative",zIndex:2}}
            onMouseEnter={e=>{(e.currentTarget.style.background="#00D4FF");(e.currentTarget.style.color="#000");}}
            onMouseLeave={e=>{(e.currentTarget.style.background="transparent");(e.currentTarget.style.color="#00D4FF");}}>
            {loading?"INITIALISING...":"STEP INSIDE"}
          </button>
          <p style={{marginTop:"clamp(16px,2.5vh,28px)",fontSize:"clamp(10px,1.1vw,14px)",letterSpacing:"0.4em",
                     color:"rgba(245,241,232,.15)",textTransform:"uppercase",animation:"fadeUp .9s ease 6.5s both",position:"relative",zIndex:2}}>
            RIGHT-CLICK DRAG — LOOK · WASD — WALK
          </p>
        </div>
      )}

      {/* ── NEWS TICKER (corridor only, no top title overlap) ── */}
      {entered&&!inRoom&&!inPreview&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:45,
                     background:"rgba(255,30,0,0.92)",borderTop:"1px solid #ff4400",
                     height:"clamp(28px,3.5vh,38px)",display:"flex",alignItems:"center",overflow:"hidden"}}>
          <div style={{background:"#ff1500",color:"#fff",fontWeight:900,
                       fontSize:"clamp(9px,1vw,12px)",letterSpacing:"0.3em",
                       padding:"0 clamp(10px,1.5vw,18px)",whiteSpace:"nowrap",height:"100%",
                       display:"flex",alignItems:"center",flexShrink:0}}>
            ⚠ BREAKING
          </div>
          <div style={{overflow:"hidden",flex:1,height:"100%",display:"flex",alignItems:"center"}}>
            <div style={{display:"flex",animation:"tickerScroll 55s linear infinite",whiteSpace:"nowrap"}}>
              {[...TICKER_ITEMS,...TICKER_ITEMS].map((item,i)=>(
                <span key={i} style={{fontSize:"clamp(9px,1vw,12px)",color:"#fff",letterSpacing:"0.06em",
                                      marginRight:"clamp(30px,4vw,60px)",fontWeight:500}}>
                  {item} &nbsp;·&nbsp;
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CORRIDOR HUD ── */}
      {entered&&!inRoom&&!inPreview&&(
        <div style={{position:"fixed",inset:0,zIndex:40,pointerEvents:"none"}}>
          <div style={{position:"absolute",top:22,left:28,opacity:0.92}}>
            <span style={{fontSize:"clamp(16px,2.2vw,28px)",fontWeight:900,letterSpacing:"0.1em",color:"#C0692E",
              textShadow:"0 0 20px #C0692E44",fontFamily:"system-ui"}}>FLEMING</span>
            <span style={{fontSize:"clamp(16px,2.2vw,28px)",fontWeight:300,letterSpacing:"0.3em",color:"#F5F1E8",
              marginLeft:8,fontFamily:"system-ui"}}>STUDIOS</span>
          </div>
          <div style={{position:"absolute",top:22,right:28,textAlign:"right",lineHeight:2.2,
                       color:"rgba(0,212,255,.8)",fontSize:"clamp(11px,1.2vw,15px)",
                       letterSpacing:"0.1em",textTransform:"uppercase",textShadow:"0 0 14px #00D4FF"}}>
            <div>Right-Click + Drag — Look</div>
            <div>WASD — Walk</div>
          </div>
          {/* Talk to AI button */}
          <button onClick={()=>{
            if(!aiGreeted.current){aiGreeted.current=true;
              const g=AI_GREETINGS[Math.floor(Math.random()*AI_GREETINGS.length)];
              setAiMessages([{from:"ai",text:g}]);setTimeout(()=>speakAI(g),200);}
            setAiChatOpen(prev=>!prev);}}
            style={{position:"absolute",top:22,left:"50%",transform:"translateX(-50%)",pointerEvents:"all",
              padding:"8px 20px",background:"rgba(0,4,12,0.75)",border:"1px solid #00D4FF44",
              color:"#00D4FF",fontSize:"clamp(10px,1vw,13px)",letterSpacing:"0.2em",textTransform:"uppercase",
              cursor:"none",fontFamily:"system-ui",transition:"all .3s",backdropFilter:"blur(4px)",
              display:"flex",alignItems:"center",gap:8}}
            onMouseEnter={e=>{e.currentTarget.style.background="#00D4FF";e.currentTarget.style.color="#000";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(0,4,12,0.75)";e.currentTarget.style.color="#00D4FF";}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:"#00D4FF",boxShadow:"0 0 6px #00D4FF",display:"inline-block"}}/>
            TALK TO FLEMING AI
          </button>
          <div style={{position:"absolute",bottom:"clamp(34px,5vh,48px)",left:"50%",transform:"translateX(-50%)",
                       display:"flex",gap:"clamp(12px,2vw,28px)",background:"rgba(0,2,5,0.65)",
                       padding:"clamp(10px,1.5vh,16px) clamp(14px,2vw,32px)",
                       border:"1px solid rgba(255,255,255,0.06)",pointerEvents:"all"}}>
            {DOOR_CONFIG.map((d,i)=>(
              <div key={i} onClick={()=>{
                // Teleport to door and enter room
                if(corridorEng.current){
                  corridorEng.current.camPos.set(d.pos[0],1.8,d.pos[2]+4);
                }
                setActiveRoom(d.room);setPhase("inside");playRoomEnter();
              }}
              style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,cursor:"none",transition:"all .2s",padding:"4px 8px",borderRadius:4}}
              onMouseEnter={e=>{e.currentTarget.style.background=`${d.hex}22`;}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:d.hex,boxShadow:`0 0 8px ${d.hex}`}}/>
                <span style={{fontSize:"clamp(8px,0.85vw,11px)",letterSpacing:"0.2em",
                              color:"rgba(245,241,232,.45)",textTransform:"uppercase"}}>
                  {d.label.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI CHAT PANEL ── */}
      {entered&&!inRoom&&aiChatOpen&&(
        <div style={{position:"fixed",bottom:60,right:24,width:"clamp(300px,28vw,420px)",maxHeight:"50vh",
          zIndex:55,pointerEvents:"all",display:"flex",flexDirection:"column",
          background:"rgba(0,4,12,0.92)",border:"1px solid #00D4FF33",
          backdropFilter:"blur(12px)",animation:"fadeUp .4s ease both"}}>
          {/* Header */}
          <div style={{padding:"12px 16px",borderBottom:"1px solid #00D4FF22",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:"#00D4FF",boxShadow:"0 0 8px #00D4FF",animation:"pulse 2s ease-in-out infinite"}}/>
            <span style={{fontSize:13,fontWeight:700,letterSpacing:"0.2em",color:"#00D4FF"}}>FLEMING AI</span>
            <span style={{fontSize:10,color:"#00D4FF55",marginLeft:"auto"}}>ONLINE</span>
          </div>
          {/* Messages */}
          <div style={{flex:1,overflowY:"auto",padding:"12px 16px",maxHeight:"35vh",display:"flex",flexDirection:"column",gap:10}}>
            {aiMessages.map((m,i)=>(
              <div key={i} style={{alignSelf:m.from==="ai"?"flex-start":"flex-end",maxWidth:"88%"}}>
                <div style={{fontSize:12,color:m.from==="ai"?"#00D4FF":"#FFA500",marginBottom:3,
                  letterSpacing:"0.15em",fontWeight:600}}>{m.from==="ai"?"FLEMING AI":"YOU"}</div>
                <div style={{padding:"8px 12px",fontSize:13,lineHeight:1.5,
                  background:m.from==="ai"?"rgba(0,212,255,0.06)":"rgba(255,165,0,0.06)",
                  border:`1px solid ${m.from==="ai"?"#00D4FF22":"#FFA50022"}`,
                  color:"rgba(245,241,232,0.85)"}}>{m.text}</div>
              </div>
            ))}
          </div>
          {/* Input */}
          <div style={{padding:"10px 12px",borderTop:"1px solid #00D4FF22",display:"flex",gap:8}}>
            <input value={aiInput} onChange={e=>setAiInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&aiInput.trim()){
                const msg=aiInput.trim();setAiInput("");
                setAiMessages(prev=>[...prev,{from:"user",text:msg}]);
                handleAIResponse(msg);
              }}}
              placeholder="Type a message..."
              style={{flex:1,padding:"8px 12px",background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(255,255,255,0.1)",color:"#F5F1E8",fontSize:13,
                fontFamily:"system-ui",outline:"none",cursor:"text"}}/>
            <button onClick={()=>{if(aiInput.trim()){
                const msg=aiInput.trim();setAiInput("");
                setAiMessages(prev=>[...prev,{from:"user",text:msg}]);
                handleAIResponse(msg);
              }}}
              style={{padding:"8px 16px",background:"#00D4FF",border:"none",color:"#000",
                fontSize:11,fontWeight:700,letterSpacing:"0.15em",cursor:"none",fontFamily:"system-ui"}}>
              SEND
            </button>
          </div>
        </div>
      )}

      {/* ── DOOR PREVIEW OVERLAY (2s then auto-enters) ── */}
      {inPreview&&roomData&&(
        <div style={{position:"fixed",inset:0,zIndex:70,display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",
          background:"rgba(0,1,4,0.88)",animation:"fadeIn .4s ease both",backdropFilter:"blur(6px)"}}>
          <p style={{fontSize:"clamp(10px,1.2vw,15px)",letterSpacing:"0.7em",color:roomData.hex,
                     marginBottom:"clamp(12px,2vh,22px)",textTransform:"uppercase",
                     animation:"fadeUp .5s ease .1s both",opacity:0}}>YOU ARE ENTERING</p>
          <h2 style={{fontSize:"clamp(32px,6vw,88px)",fontWeight:900,color:"#F5F1E8",
                      marginBottom:10,textAlign:"center",textShadow:`0 0 60px ${roomData.hex}`,
                      letterSpacing:"0.06em",animation:"fadeUp .5s ease .25s both",opacity:0}}>
            {roomData.label}
          </h2>
          <p style={{fontSize:"clamp(14px,1.8vw,24px)",color:"rgba(245,241,232,.4)",
                     letterSpacing:"0.08em",animation:"fadeUp .5s ease .4s both",opacity:0}}>
            {roomData.sub}
          </p>
          <div style={{marginTop:"clamp(28px,5vh,52px)",width:"clamp(200px,28vw,340px)",
                       height:3,background:"rgba(255,255,255,0.08)",overflow:"hidden",
                       animation:"fadeUp .5s ease .55s both",opacity:0}}>
            <div style={{height:"100%",background:roomData.hex,boxShadow:`0 0 16px ${roomData.hex}`,
                         animation:"loadBar 2s linear forwards"}}/>
          </div>
          <p style={{marginTop:14,fontSize:"clamp(9px,1vw,12px)",letterSpacing:"0.4em",
                     color:roomData.hex+"66",textTransform:"uppercase",
                     animation:"fadeUp .5s ease .7s both",opacity:0}}>Entering…</p>
          <style>{`@keyframes loadBar{from{width:0}to{width:100%}}`}</style>
        </div>
      )}

      {/* ── ROOM HUD ── */}
      {inRoom&&roomData&&(
        <div style={{position:"fixed",inset:0,zIndex:80,pointerEvents:"none"}}>
          {/* Top bar */}
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,
                       background:roomData.hex,boxShadow:`0 0 24px ${roomData.hex}`,
                       animation:"fadeIn .6s ease both"}}/>
          {/* Room name */}
          <div style={{position:"absolute",top:16,left:0,right:0,display:"flex",
                       justifyContent:"center",pointerEvents:"none",animation:"fadeUp .5s ease .2s both",opacity:0}}>
            <div style={{background:"rgba(0,1,4,0.75)",border:`1px solid ${roomData.hex}44`,
                         padding:"clamp(6px,1vh,10px) clamp(20px,3vw,36px)",backdropFilter:"blur(4px)"}}>
              <span style={{fontSize:"clamp(9px,1vw,13px)",letterSpacing:"0.5em",
                            color:roomData.hex,textTransform:"uppercase",fontWeight:700}}>
                {roomData.label}
              </span>
            </div>
          </div>
          {/* Controls */}
          <div style={{position:"absolute",top:22,right:24,textAlign:"right",lineHeight:2.1,
                       color:`${roomData.hex}99`,fontSize:"clamp(10px,1.1vw,13px)",
                       letterSpacing:"0.1em",textTransform:"uppercase"}}>
            <div>Right-Click + Drag — Look</div>
            <div>WASD — Explore</div>
          </div>
          {/* Back button */}
          <button onClick={(e)=>{e.stopPropagation();exitRoom();}} style={{position:"absolute",bottom:28,left:"50%",
            transform:"translateX(-50%)",pointerEvents:"all",zIndex:60,
            padding:"clamp(12px,1.8vh,18px) clamp(36px,5vw,60px)",
            border:`1px solid ${roomData.hex}55`,color:roomData.hex,background:"rgba(0,1,4,0.8)",
            fontSize:"clamp(11px,1.2vw,15px)",letterSpacing:"0.5em",textTransform:"uppercase",
            cursor:"none",fontFamily:"inherit",transition:"all .3s",backdropFilter:"blur(4px)"}}
            onMouseEnter={e=>{(e.currentTarget.style.background=roomData.hex);(e.currentTarget.style.color="#000");}}
            onMouseLeave={e=>{(e.currentTarget.style.background="rgba(0,1,4,0.8)");(e.currentTarget.style.color=roomData.hex);}}>
            ← BACK TO STUDIO
          </button>
          {/* Secret room score */}
          {activeRoom==="secret"&&(
            <div style={{position:"absolute",bottom:80,left:"50%",transform:"translateX(-50%)",
              pointerEvents:"none",textAlign:"center",animation:"fadeUp .5s ease .3s both",opacity:0}}>
              <div style={{fontSize:"clamp(13px,1.5vw,18px)",color:"#00FFD0",letterSpacing:"0.3em",
                marginBottom:6,textTransform:"uppercase"}}>FLAMINGO HUNT</div>
              <div style={{fontSize:"clamp(32px,5vw,56px)",fontWeight:900,color:"#F5F1E8",
                textShadow:"0 0 40px #00FFD066"}}>{secretScore}</div>
            </div>
          )}
          {/* Game intro popup */}
          {activeRoom==="secret"&&gameIntroShown&&(
            <div style={{position:"absolute",inset:0,zIndex:90,display:"flex",alignItems:"center",
              justifyContent:"center",background:"rgba(0,10,20,0.85)",backdropFilter:"blur(6px)",
              animation:"fadeIn .4s ease both",pointerEvents:"all"}}
              onClick={()=>setGameIntroShown(false)}>
              <div style={{textAlign:"center",maxWidth:600,padding:"40px 30px",
                background:"rgba(0,20,30,0.9)",border:"1px solid #00FFD044",
                boxShadow:"0 0 60px #00FFD022"}}>
                <div style={{fontSize:"clamp(10px,1.2vw,14px)",letterSpacing:"0.5em",color:"#00FFD0",
                  marginBottom:16}}>🎯 WELCOME TO</div>
                <div style={{fontSize:"clamp(28px,4.5vw,48px)",fontWeight:900,color:"#F5F1E8",
                  lineHeight:1.2,marginBottom:16}}>FLAMINGO HUNT</div>
                <div style={{fontSize:"clamp(14px,1.6vw,20px)",color:"#C0692E",fontWeight:600,
                  lineHeight:1.5,marginBottom:20}}>
                  Shoot 10 flamingos and get a <span style={{color:"#00FFD0"}}>FREE AI Growth
                  Optimisation Report</span> for your business!
                </div>
                <div style={{fontSize:"clamp(11px,1.1vw,14px)",color:"rgba(245,241,232,0.4)",
                  letterSpacing:"0.15em"}}>LEFT CLICK — SHOOT · WASD — MOVE · CLICK ANYWHERE TO START</div>
              </div>
            </div>
          )}
          {/* Newsletter popup when 10 flamingos hit */}
          {activeRoom==="secret"&&secretUnlocked&&!newsletterSubmitted&&(
            <div style={{position:"absolute",inset:0,zIndex:100,display:"flex",alignItems:"center",
              justifyContent:"center",background:"rgba(0,20,40,0.88)",backdropFilter:"blur(8px)",
              animation:"fadeIn .5s ease both",pointerEvents:"all"}}>
              <div style={{background:"linear-gradient(145deg, #0a1a2a 0%, #0d1f30 50%, #081825 100%)",
                border:"1px solid #FFA50044",padding:"clamp(28px,5vh,52px) clamp(24px,4vw,48px)",
                maxWidth:480,width:"90%",textAlign:"center",position:"relative",
                boxShadow:"0 0 80px #FFA50022, inset 0 0 40px #FFA50008"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,
                  background:"linear-gradient(90deg, #FFA500, #FFD700, #40E0D0)"}}/>
                <div style={{fontSize:"clamp(10px,1.2vw,14px)",letterSpacing:"0.5em",color:"#FFA500",
                  marginBottom:"clamp(8px,1.5vh,16px)",textTransform:"uppercase"}}>
                  🎉 CONGRATULATIONS 🎉
                </div>
                <div style={{fontSize:"clamp(24px,4vw,42px)",fontWeight:900,color:"#F5F1E8",
                  lineHeight:1.15,marginBottom:8}}>
                  <div>You Unlocked a</div>
                  <div style={{color:"#40E0D0",textShadow:"0 0 40px #40E0D066"}}>Free AI Growth Plan</div>
                </div>
                <div style={{fontSize:"clamp(12px,1.3vw,16px)",color:"rgba(245,241,232,0.5)",
                  marginBottom:"clamp(20px,3vh,32px)",lineHeight:1.6}}>
                  <div>Enter your email below and we will send you</div>
                  <div>a personalised AI optimization growth plan.</div>
                </div>
                <div style={{display:"flex",gap:0,maxWidth:380,margin:"0 auto"}}>
                  <input type="email" value={newsletterEmail}
                    onChange={e=>setNewsletterEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={{flex:1,padding:"clamp(12px,1.8vh,16px) clamp(14px,2vw,20px)",
                      background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",
                      borderRight:"none",color:"#F5F1E8",fontSize:"clamp(13px,1.4vw,16px)",
                      fontFamily:"system-ui",outline:"none"}}/>
                  <button onClick={()=>{if(newsletterEmail.includes("@")){setNewsletterSubmitted(true);}}}
                    style={{padding:"clamp(12px,1.8vh,16px) clamp(18px,2.5vw,28px)",
                      background:"#FFA500",border:"1px solid #FFA500",color:"#fff",
                      fontSize:"clamp(11px,1.2vw,14px)",fontWeight:700,letterSpacing:"0.15em",
                      fontFamily:"system-ui",cursor:"none",textTransform:"uppercase",
                      transition:"all .3s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="#40E0D0";e.currentTarget.style.borderColor="#40E0D0";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="#FFA500";e.currentTarget.style.borderColor="#FFA500";}}>
                    CLAIM
                  </button>
                </div>
                <div style={{marginTop:"clamp(12px,2vh,18px)",fontSize:"clamp(9px,1vw,11px)",
                  color:"rgba(245,241,232,0.2)",letterSpacing:"0.2em"}}>
                  NO SPAM · JUST YOUR FREE AI GROWTH PLAN
                </div>
                <button onClick={()=>{setSecretUnlocked(false);}}
                  style={{marginTop:"clamp(14px,2vh,20px)",padding:"8px 24px",background:"transparent",
                    border:"1px solid rgba(245,241,232,0.15)",color:"rgba(245,241,232,0.4)",
                    fontSize:"clamp(9px,1vw,11px)",letterSpacing:"0.3em",textTransform:"uppercase",
                    cursor:"none",fontFamily:"system-ui",transition:"all .3s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(245,241,232,0.4)";e.currentTarget.style.color="rgba(245,241,232,0.7)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(245,241,232,0.15)";e.currentTarget.style.color="rgba(245,241,232,0.4)";}}>
                  CLOSE
                </button>
              </div>
            </div>
          )}
          {/* Newsletter success */}
          {activeRoom==="secret"&&newsletterSubmitted&&(
            <div style={{position:"absolute",inset:0,zIndex:100,display:"flex",alignItems:"center",
              justifyContent:"center",background:"rgba(0,0,5,0.85)",backdropFilter:"blur(8px)",
              animation:"fadeIn .5s ease both",pointerEvents:"all"}}>
              <div style={{textAlign:"center",animation:"fadeUp .5s ease both"}}>
                <div style={{fontSize:"clamp(48px,8vw,80px)",marginBottom:16}}>🎉</div>
                <div style={{fontSize:"clamp(24px,4vw,42px)",fontWeight:900,color:"#00E5B0",
                  textShadow:"0 0 40px #00E5B066",marginBottom:12}}>YOU ARE IN!</div>
                <div style={{fontSize:"clamp(13px,1.5vw,18px)",color:"rgba(245,241,232,0.6)",
                  lineHeight:1.6,marginBottom:24}}>
                  <div>Check your inbox for your free</div>
                  <div>AI Optimization Growth Plan.</div>
                </div>
                <button onClick={exitRoom}
                  style={{padding:"clamp(12px,1.8vh,16px) clamp(36px,5vw,52px)",
                    border:"1px solid #00E5B055",color:"#00E5B0",background:"rgba(0,1,4,0.8)",
                    fontSize:"clamp(11px,1.2vw,14px)",letterSpacing:"0.4em",textTransform:"uppercase",
                    cursor:"none",fontFamily:"system-ui",transition:"all .3s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="#00E5B0";e.currentTarget.style.color="#000";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="rgba(0,1,4,0.8)";e.currentTarget.style.color="#00E5B0";}}>
                  ← BACK TO STUDIO
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes introLine1{from{opacity:0;transform:translateY(30px) scale(0.95);filter:blur(8px)}to{opacity:1;transform:translateY(0) scale(1);filter:blur(0)}}
        @keyframes introLine2{from{opacity:0;transform:translateY(30px) scale(0.95);filter:blur(8px)}to{opacity:1;transform:translateY(0) scale(1);filter:blur(0)}}
        @keyframes introLogo{from{opacity:0;transform:scale(0.8);filter:blur(4px)}to{opacity:1;transform:scale(1);filter:blur(0)}}
        @keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}
        @keyframes cycleServices{0%,25%{transform:translateY(0)}25.01%,50%{transform:translateY(-25%)}50.01%,75%{transform:translateY(-50%)}75.01%,100%{transform:translateY(-75%)}}
        @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        *{cursor:none;box-sizing:border-box;margin:0;padding:0}
        html,body{width:100%;height:100%;overflow:hidden;background:#000205;font-family:system-ui,sans-serif}
      `}</style>
    </>
  );
}
