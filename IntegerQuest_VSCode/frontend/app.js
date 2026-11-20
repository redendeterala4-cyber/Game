const $ = (id) => document.getElementById(id);
const screens = ["login","home","map","story","lesson","puzzle","setup","game","result","assessment","myprogress","teacher","admin","account","profile"];
let gameMode="Individual", gameTopic="Mixed", gameLevel="Easy", gameQuestions=[];
let current=0, selected=null, checked=false, scoreA=0, scoreB=0, turn=1;
let player="Learner", nameA="Player 1", nameB="Player 2", testType="Practice";
let preScore=null, postScore=null, localQueue=JSON.parse(localStorage.getItem("iq_queue")||"[]");

// Score target (percent). Below this, the result screen shows a full review and study pointers.
const PASS_PERCENT=75;
let missed=[];

// Study pointers shown for each topic the learner missed questions in (and on boss reviews).
// Methods follow the ARAL Math worksheet info boxes (Grade 7).
const topicPointers={
 Fractions:[
  "Similar fractions (same denominator): add or subtract the numerators and copy the denominator.",
  "Dissimilar fractions: make them similar first using the least common denominator (LCD).",
  "Regroup when the top fraction is smaller: borrow 1 from the whole number (1 = 5/5, 8/8 …).",
  "Multiply: numerator × numerator and denominator × denominator. Cancel common factors first.",
  "Divide: change the divisor to its reciprocal and multiply. Change mixed numbers to improper fractions first."
 ],
 Decimals:[
  "Add and subtract: line up the decimal points and fill empty places with zeros.",
  "Multiply as whole numbers, then count the decimal places in both factors to place the point.",
  "Divide by a decimal: move the point of the divisor right until it is a whole number, and move the dividend's point the same number of places.",
  "÷ 10, 100, 1,000 moves the decimal point 1, 2, 3 places to the LEFT.",
  "÷ 0.1, 0.01, 0.001 moves the decimal point 1, 2, 3 places to the RIGHT."
 ],
 Geometry:[
  "Prisms have 2 parallel bases; pyramids have 1 base and triangular lateral faces. Both are named after their base.",
  "Composite area: split the figure into rectangles, triangles and circles, find each area, then add (or subtract a hole).",
  "Areas: rectangle = l × w, triangle = ½ × b × h, circle = πr², semicircle = ½ × πr².",
  "Surface area: cube 6s², rectangular prism 2(lw + lh + wh), square pyramid b² + 2bh, triangular prism bh + 2ls + lb.",
  "Cylinder 2πr² + 2πrh, cone πrs + πr², sphere 4πr². Use π = 3.14 and write square units (cm²)."
 ],
 Speed:[
  "Speed units: km/h, m/s, mph. Distance units: m, km. Time units: seconds, minutes, hours.",
  "Speed = Distance ÷ Time (S = D ÷ T).",
  "Distance = Speed × Time (D = S × T).",
  "Time = Distance ÷ Speed (T = D ÷ S). Multiply hours by 60 to get minutes.",
  "Arrival time = departure time + travel time. For a trip in parts, add the time of each part."
 ],
 Outcomes:[
  "An outcome is one possible result. The list of all outcomes is the sample space.",
  "Pair every choice in the first group with every choice in the second group.",
  "Use a table or a tree diagram so no outcome is missed or repeated.",
  "Number of outcomes = product of the number of choices: 3 shirts × 2 pants = 6.",
  "A coin tossed 3 times: 2 × 2 × 2 = 8 outcomes (HHH to TTT)."
 ],
 Integers:[
  "Adding, same signs: add the numbers and keep the sign: (−6) + (−3) = −9.",
  "Adding, different signs: subtract the numbers and copy the sign of the larger number: 9 + (−8) = 1.",
  "Subtracting: add the opposite of the subtrahend: 6 − 4 = 6 + (−4); 9 − (−6) = 9 + 6.",
  "Multiplying or dividing: same signs → positive; different signs → negative.",
  "A number plus its opposite is zero: 51 + (−51) = 0."
 ]
};

// Quick review shown before every Adventure battle: 3 key rules + a "try it first" example for that topic and level.
// Boss stages ("All levels") show all of the topic's pointers plus the Difficult example.
const LESSONS={
 Fractions:{
  Easy:{title:"Adding and subtracting similar fractions",tips:[
   "Similar fractions have the same denominator. Add or subtract the numerators and copy the denominator.",
   "Always write the answer in lowest terms: divide the numerator and denominator by their greatest common factor.",
   "Mixed numbers: add or subtract the whole numbers, then the fractions."],
   ex:{q:"Add: 4/9 + 2/9",steps:["Same denominator, so add the numerators: 4 + 2 = 6.","Copy the denominator: 6/9.","Lowest terms: divide 6 and 9 by 3 → 2/3."],a:"2/3"}},
  Average:{title:"Dissimilar fractions and multiplying fractions",tips:[
   "Dissimilar fractions: make them similar using the least common denominator (LCD), then add or subtract.",
   "Regrouping: if the top fraction is smaller, borrow 1 from the whole number (2 1/5 = 1 6/5).",
   "Multiplying: multiply the numerators and the denominators. Cancel common factors first."],
   ex:{q:"Add: 2/3 + 1/4",steps:["The LCD of 3 and 4 is 12.","2/3 = 8/12 and 1/4 = 3/12.","8/12 + 3/12 = 11/12."],a:"11/12"}},
  Difficult:{title:"Dividing fractions and mixed numbers",tips:[
   "To divide, change the divisor to its reciprocal and multiply: 1/3 ÷ 2/3 = 1/3 × 3/2.",
   "Change mixed numbers to improper fractions first: 2 1/3 = 7/3.",
   "Word problems: 'of' means multiply, 'how many … in' means divide, 'in all' means add."],
   ex:{q:"Divide: 1 1/2 ÷ 3/4",steps:["Change 1 1/2 to 3/2.","Multiply by the reciprocal of 3/4: 3/2 × 4/3.","Cancel the 3s: 4/2 = 2."],a:"2"}}
 },
 Decimals:{
  Easy:{title:"Adding, subtracting, and dividing by 10, 100, 1,000",tips:[
   "Line up the decimal points in a column, then add or subtract like whole numbers.",
   "Fill empty places with zeros: 8.5 − 2.75 → 8.50 − 2.75.",
   "Dividing by 10, 100 or 1,000 moves the decimal point 1, 2 or 3 places to the left."],
   ex:{q:"Subtract: 6.4 − 2.75",steps:["Write 6.4 as 6.40.","Line up the points: 6.40 − 2.75.","Subtract and regroup: 3.65."],a:"3.65"}},
  Average:{title:"Multiplying and dividing decimals",tips:[
   "Multiply as whole numbers, then count the decimal places in both factors to place the point.",
   "Dividing a decimal by a whole number: put the point in the answer straight above the point in the dividend.",
   "Dividing by 0.1, 0.01 or 0.001 moves the decimal point 1, 2 or 3 places to the right."],
   ex:{q:"Multiply: 1.3 × 0.4",steps:["13 × 4 = 52.","1.3 has 1 decimal place and 0.4 has 1: 2 places in all.","Place the point 2 places from the right: 0.52."],a:"0.52"}},
  Difficult:{title:"Dividing by a decimal, and money problems",tips:[
   "When the divisor is a decimal, move its point right until it is a whole number. Move the dividend's point the same number of places.",
   "Add zeros to keep dividing. Round to the nearest hundredth when asked.",
   "Money: line up the centavos. Change = amount paid − total cost."],
   ex:{q:"Divide: 3.6 ÷ 0.12",steps:["Move both points 2 places right: 360 ÷ 12.","360 ÷ 12 = 30."],a:"30"}}
 },
 Geometry:{
  Easy:{title:"Solid figures",tips:[
   "Prisms have 2 parallel bases and rectangular lateral faces. Pyramids have 1 base and triangular lateral faces. Both are named after their base.",
   "A cube has 6 equal square faces. A cylinder has 2 circular bases. A cone has 1 circular base and an apex. Every point of a sphere is one radius from the center.",
   "Plane figures are flat (circle, square, triangle). Solid figures are 3-D (cube, sphere, cone)."],
   ex:{q:"A solid has 2 pentagon bases and 5 rectangular faces. What is it?",steps:["Two parallel bases with rectangular lateral faces → a prism.","The bases are pentagons."],a:"Pentagonal prism"}},
  Average:{title:"Composite area and surface area",tips:[
   "Composite figure: split it into rectangles, triangles and circles. Find each area, then add (or subtract a hole).",
   "Rectangle = l × w, triangle = ½ × b × h, circle = πr², semicircle = ½ × πr².",
   "Surface area is the total area of all faces. Cube: SA = 6s². Rectangular prism: SA = 2(lw + lh + wh)."],
   ex:{q:"A rectangle 6 cm by 4 cm has a triangle (base 6 cm, height 2 cm) on top. What is the total area?",steps:["Rectangle: 6 × 4 = 24 cm².","Triangle: ½ × 6 × 2 = 6 cm².","Total: 24 + 6 = 30 cm²."],a:"30 cm²"}},
  Difficult:{title:"Surface area of solids",tips:[
   "Cylinder: SA = 2πr² + 2πrh. Cone: SA = πrs + πr² (s = slant height). Sphere: SA = 4πr².",
   "Square pyramid: SA = b² + 2bh (b = base edge, h = slant height). Triangular prism: SA = bh + 2ls + lb.",
   "Use π = 3.14, square the radius before multiplying, and write square units (cm², m²)."],
   ex:{q:"Find the surface area of a cylinder with r = 1 cm and h = 4 cm.",steps:["Two bases: 2 × 3.14 × 1 × 1 = 6.28.","Side: 2 × 3.14 × 1 × 4 = 25.12.","Total: 6.28 + 25.12 = 31.4 cm²."],a:"31.4 cm²"}}
 },
 Speed:{
  Easy:{title:"Speed, distance and time",tips:[
   "Speed has units like km/h, m/s or mph. Distance: m or km. Time: seconds, minutes or hours.",
   "Use the triangle: D on top, S and T side by side at the bottom.",
   "Cover what you want: S = D ÷ T, D = S × T, T = D ÷ S."],
   ex:{q:"A bike goes 30 km in 2 hours. What is its speed?",steps:["Speed is asked, so S = D ÷ T.","30 ÷ 2 = 15."],a:"15 km/h"}},
  Average:{title:"Finding distance and time",tips:[
   "Distance = speed × time. Multiply the speed by the number of hours.",
   "Time = distance ÷ speed. With km and km/h, the answer is in hours.",
   "Change hours to minutes by multiplying by 60: 0.5 hour = 30 minutes."],
   ex:{q:"A jeepney travels 45 km at 30 km/h. How long does it take?",steps:["Time is asked: T = D ÷ S.","45 ÷ 30 = 1.5 hours.","1.5 hours = 1 hour 30 minutes."],a:"1.5 hours"}},
  Difficult:{title:"Trip problems",tips:[
   "Arrival time = departure time + travel time.",
   "Travel time from clock times: count the hours between them (7:00 AM to 11:00 AM = 4 hours).",
   "Trips in two parts: find the time of each part, then add."],
   ex:{q:"A bus leaves at 8:15 AM and travels 50 km at 40 km/h. When does it arrive?",steps:["T = 50 ÷ 40 = 1.25 hours.","1.25 hours = 1 hour 15 minutes.","8:15 AM + 1 h 15 min = 9:30 AM."],a:"9:30 AM"}}
 },
 Outcomes:{
  Easy:{title:"Listing outcomes",tips:[
   "An outcome is one possible result. A coin has 2 outcomes (H, T). A die has 6.",
   "List outcomes in order so none is missed or repeated.",
   "Pair every choice in the first group with every choice in the second."],
   ex:{q:"A coin is tossed and a spinner (red, blue) is spun. List all the outcomes.",steps:["Pair H with each color: H-red, H-blue.","Pair T with each color: T-red, T-blue."],a:"4 outcomes"}},
  Average:{title:"Tables and tree diagrams",tips:[
   "Table: one group down the side, the other across the top. Each cell is one outcome.",
   "Tree diagram: a branch for each first choice, then a branch for each second choice from it.",
   "Number of outcomes = (choices in group 1) × (choices in group 2)."],
   ex:{q:"Jun has 3 shirts and 2 pants. How many outfits can he make?",steps:["Draw 3 shirt branches, each splitting into 2 pants branches.","Count the ends: 3 × 2 = 6."],a:"6 outfits"}},
  Difficult:{title:"Outcomes with three choices",tips:[
   "For three choices, multiply all three counts: 2 × 3 × 2 = 12.",
   "Tossing a coin 3 times gives 2 × 2 × 2 = 8 outcomes.",
   "When items are picked at the same time, red-blue and blue-red are the same outcome."],
   ex:{q:"List all outcomes of tossing a coin 3 times.",steps:["Starting with H: HHH, HHT, HTH, HTT.","Starting with T: THH, THT, TTH, TTT."],a:"8 outcomes"}}
 },
 Integers:{
  Easy:{title:"Adding integers",tips:[
   "Same signs: add the numbers and keep the sign: (−6) + (−3) = −9.",
   "Different signs: subtract the numbers and copy the sign of the larger number: 9 + (−8) = 1.",
   "A number plus its opposite is zero: 51 + (−51) = 0."],
   ex:{q:"Add: (−15) + 6",steps:["Different signs, so subtract: 15 − 6 = 9.","15 is the larger number and it is negative, so copy the − sign."],a:"−9"}},
  Average:{title:"Subtracting integers",tips:[
   "To subtract, add the opposite of the subtrahend: 6 − 4 = 6 + (−4).",
   "Subtracting a negative becomes adding a positive: 9 − (−6) = 9 + 6.",
   "Then use the rules for adding integers."],
   ex:{q:"Subtract: (−8) − (−20)",steps:["Add the opposite of −20, which is +20: (−8) + 20.","Different signs: 20 − 8 = 12. The larger number, 20, is positive."],a:"12"}},
  Difficult:{title:"Multiplying and dividing integers",tips:[
   "Same signs → positive: (−9) × (−7) = 63 and (−40) ÷ (−4) = 10.",
   "Different signs → negative: 8 × (−6) = −48 and 84 ÷ (−3) = −28.",
   "With three or more factors, count the negatives: an even number gives +, an odd number gives −."],
   ex:{q:"Multiply: (−4) × 5 × (−3)",steps:["There are 2 negative factors (an even number), so the answer is positive.","4 × 5 × 3 = 60."],a:"60"}}
 }
};

// ===== Adventure mode =====
// Six lands in the ARAL Math worksheet order (Grade 7), three stages each.
// Stage 3 is the boss and uses every level of the topic.
const HEARTS=3;
const LANDS=[
 {topic:"Fractions",name:"Fraction Falls",icon:"🏞️",theme:"t-falls",
  story:"The great waterfall has split into uneven streams! Put the pieces back together to climb to the top, where the Splitter Serpent waits.",
  stages:[
   {name:"Pebble Pools",level:"Easy",foe:"Half-Pint Frog",foeIcon:"🐸",intro:"Little frogs hop between pools that are cut into equal parts.",line:"Ribbit! Can you add pieces of the same size?"},
   {name:"Rapids Bridge",level:"Average",foe:"Denominator Duck",foeIcon:"🦆",intro:"A duck paddles across the bridge, mixing thirds with fourths.",line:"Quack! Pieces of different sizes never fit together!"},
   {name:"Top of the Falls",level:"All levels",boss:true,foe:"The Splitter Serpent",foeIcon:"🐍",intro:"The serpent chops everything into fractions and dares you to multiply and divide them.",line:"Sssplit, multiply, divide… you can't do it all!"}
  ]},
 {topic:"Decimals",name:"Decimal Docks",icon:"⚓",theme:"t-sea",
  story:"Fog has rolled over Decimal Docks and every decimal point has drifted out of place. Line them up to sail past Captain Shark.",
  stages:[
   {name:"Fishing Pier",level:"Easy",foe:"Misplaced Mackerel",foeIcon:"🐟",intro:"Fish flop around the pier, knocking decimal points out of line.",line:"Blub! Line up the points? Never!"},
   {name:"Cargo Cranes",level:"Average",foe:"Octo-Multiplier",foeIcon:"🐙",intro:"An octopus juggles crates of decimals with all eight arms.",line:"Count the decimal places? I've lost count!"},
   {name:"Lighthouse",level:"All levels",boss:true,foe:"Captain Shark",foeIcon:"🦈",intro:"Captain Shark circles the lighthouse with the trickiest divisions in the sea.",line:"Divide by 0.01? You'll sink first!"}
  ]},
 {topic:"Geometry",name:"Shape Summit",icon:"🏔️",theme:"t-peak",
  story:"Shape Summit is built from prisms, pyramids, cylinders and spheres. Name every solid and measure every face to reach the top.",
  stages:[
   {name:"Prism Pass",level:"Easy",foe:"Pyramid Bat",foeIcon:"🦇",intro:"Bats swoop between stone prisms and pyramids.",line:"Prism or pyramid? You'll never tell them apart!"},
   {name:"Area Cliffs",level:"Average",foe:"Compass Eagle",foeIcon:"🦅",intro:"An eagle's nest is built from rectangles, triangles and half-circles.",line:"Can you add up every piece of my nest?"},
   {name:"Summit Vault",level:"All levels",boss:true,foe:"Surface Golem",foeIcon:"🗿",intro:"The golem is covered in faces, and it wants you to find the area of all of them.",line:"Cylinders, cones, spheres… measure my whole surface!"}
  ]},
 {topic:"Speed",name:"Speed Highway",icon:"🛣️",theme:"t-desert",
  story:"Every vehicle on Speed Highway has lost its timetable. Work out speed, distance and time to keep the traffic moving.",
  stages:[
   {name:"Tricycle Lane",level:"Easy",foe:"Turbo Tortoise",foeIcon:"🐢",intro:"A tortoise has mixed up all the road signs: km, km/h and hours.",line:"Is 60 km/h a distance? Hehe!"},
   {name:"Jeepney Junction",level:"Average",foe:"Racing Rooster",foeIcon:"🐓",intro:"A rooster races every jeepney and never checks the clock.",line:"How long will the trip take? Cock-a-doodle-guess!"},
   {name:"Toll Gate",level:"All levels",boss:true,foe:"Rush-Hour Rhino",foeIcon:"🦏",intro:"The rhino blocks the toll gate until you can plan every trip.",line:"Leave at 7:45, arrive when? CHARGE!"}
  ]},
 {topic:"Outcomes",name:"Chance Carnival",icon:"🎡",theme:"t-fair",
  story:"The games at Chance Carnival are all mixed up. List every possible outcome to win the prizes and face the Ringmaster.",
  stages:[
   {name:"Coin Booth",level:"Easy",foe:"Flip-Flop Monkey",foeIcon:"🐒",intro:"A monkey flips coins and hides some of the outcomes.",line:"Heads or tails? I'll hide the rest!"},
   {name:"Spinner Tent",level:"Average",foe:"Branching Owl",foeIcon:"🦉",intro:"An owl perches on tree-diagram branches that keep splitting.",line:"Count every branch, if you can!"},
   {name:"Big Top",level:"All levels",boss:true,foe:"The Ringmaster",foeIcon:"🎩",intro:"The Ringmaster runs coins, dice and spinners all at once.",line:"Three games at once — how many ways can it end?"}
  ]},
 {topic:"Integers",name:"Integer Island",icon:"🏝️",theme:"t-forest",
  story:"Captain Minus has scrambled Integer Island's number line! Cross the island to his pirate ship and put every sign back where it belongs.",
  stages:[
   {name:"Shell Beach",level:"Easy",foe:"Crab of Confusion",foeIcon:"🦀",intro:"Crabs walk sideways along the number line, adding positives and negatives.",line:"Snip snap! Add −9 and 4? Bet you can't!"},
   {name:"Coral Caves",level:"Average",foe:"Sign-Swapping Squid",foeIcon:"🦑",intro:"Deep in the caves, a squid turns every subtraction into a tangle.",line:"Subtract a negative? I'll tie you in knots!"},
   {name:"Pirate Ship",level:"All levels",boss:true,foe:"Captain Minus",foeIcon:"🏴‍☠️",intro:"Captain Minus waits on deck with every multiplying and dividing trick he knows.",line:"Arr! Two negatives make WHAT?!"}
  ]}
];
let adv=null; // current stage: {land, stage, hearts, hp, maxHp}
let avatar=(()=>{try{return localStorage.getItem("iq_avatar")||"🦸";}catch(e){return "🦸";}})();

// Progress is kept on this device per student account and synced to the server (see auth.js).
function heroName(){return (authUser&&authUser.role==="student"&&authUser.name)||$("playerName").value.trim()||"Learner";}
function playerTag(){return userTag()||heroName().toLowerCase();}
function progressKey(){return "iq_adv_"+playerTag();}
function loadProgress(){try{return Object.assign({xp:0,stars:{},trailBest:{}},JSON.parse(localStorage.getItem(progressKey())||"{}"));}catch(e){return {xp:0,stars:{},trailBest:{}};}}
function saveProgress(p){try{localStorage.setItem(progressKey(),JSON.stringify(p));}catch(e){}queueProgressSync();}
const stageKey=(li,si)=>`${LANDS[li].topic}-${si}`;
const starText=n=>"★".repeat(n)+"☆".repeat(3-n);
function landOpen(p,li){return li===0||(p.stars[stageKey(li-1,2)]||0)>0;}
function stageOpen(p,li,si){return landOpen(p,li)&&(si===0||(p.stars[stageKey(li,si-1)]||0)>0);}
// ===== Question picking: no repeats =====
// Each fight takes bank questions this player hasn't seen yet (per nickname, on this device) and, when
// withVariants is on, mixes in brand-new number variants from variants.js — so no two fights are the same.
// When every bank question for that topic/level has been seen, that pool starts over.
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function seenKey(){return "iq_seen_"+playerTag();}
function loadSeen(){try{return new Set(JSON.parse(localStorage.getItem(seenKey())||"[]"));}catch(e){return new Set();}}
function saveSeen(set){try{localStorage.setItem(seenKey(),JSON.stringify([...set]));}catch(e){}}
function pickQuestions(topic,level,count,withVariants){
 const match=q=>(topic==="Mixed"||q.topic===topic)&&(level==="All levels"||q.level===level);
 const pool=questionBank.filter(match),seen=loadSeen();
 const nVar=withVariants&&typeof QuestionVariants!=="undefined"?Math.ceil(count/2):0;
 let fromBank=shuffle(pool.filter(q=>!seen.has(q.prompt))).slice(0,count-nVar);
 if(fromBank.length<count-nVar){ // pool used up: start it over, avoiding the ones just picked
  pool.forEach(q=>seen.delete(q.prompt));
  const chosen=new Set(fromBank);
  fromBank=fromBank.concat(shuffle(pool.filter(q=>!chosen.has(q))).slice(0,count-nVar-fromBank.length));
 }
 fromBank.forEach(q=>seen.add(q.prompt));saveSeen(seen);
 const variants=nVar?QuestionVariants.make(topic,level,count-fromBank.length):[];
 return shuffle(fromBank.concat(variants)).slice(0,count);
}

function renderMap(){
 const p=loadProgress(),lv=Math.floor(p.xp/100)+1,total=Object.values(p.stars).reduce((a,b)=>a+b,0);
 $("mapHud").innerHTML=`<span class="mh-avatar">${avatar}</span>
  <div class="mh-info"><b>${escapeHtml(heroName())}</b><small>Level ${lv} hero • ${p.xp} XP</small><div class="xpbar"><span style="width:${p.xp%100}%"></span></div></div>
  <span class="mh-stars">⭐ ${total}/${LANDS.length*9}</span>`;
 $("mapLands").innerHTML=LANDS.map((L,li)=>{
  const open=landOpen(p,li),got=L.stages.reduce((a,_,si)=>a+(p.stars[stageKey(li,si)]||0),0);
  const nodes=L.stages.map((S,si)=>{
   const st=p.stars[stageKey(li,si)]||0,can=stageOpen(p,li,si),cls=st?"cleared":can?"open":"locked";
   return `<button class="node ${cls}${S.boss?" boss":""}" data-land="${li}" data-stage="${si}" ${can?"":"disabled"}>
    <span class="node-icon">${can?S.foeIcon:"🔒"}</span><span class="node-name">${S.name}</span>
    <span class="node-stars">${st?starText(st):S.boss?"BOSS":"NEW"}</span></button>`;
  }).join("");
  return `<div class="land${open?"":" locked"}">
   <div class="land-head ${L.theme}"><span class="land-icon">${L.icon}</span><div><b>${L.name}</b><small>${L.topic}</small></div><span class="land-stars">⭐ ${got}/9</span></div>
   <div class="trail">${nodes}</div>
   ${open?"":`<p class="land-lock">🔒 Defeat ${LANDS[li-1].stages[2].foe} in ${LANDS[li-1].name} to unlock.</p>`}</div>`;
 }).join("");
 document.querySelectorAll(".node[data-land]").forEach(b=>b.onclick=()=>openStory(+b.dataset.land,+b.dataset.stage));
}
function openStory(li,si){
 const L=LANDS[li],S=L.stages[si],n=8;
 adv={land:li,stage:si};
 $("storyCard").className=`story-card ${L.theme}`;
 $("storyCard").innerHTML=`<p class="eyebrow">${L.icon} ${L.name.toUpperCase()} • STAGE ${si+1} OF 3</p>
  <h2>${S.name}</h2>
  <p class="story-text">${si===0?L.story+" ":""}${S.intro}</p>
  <div class="foe-show"><span class="foe-big">${S.foeIcon}</span><div class="bubble"><b>${S.foe}${S.boss?" · BOSS":""}</b><span>“${S.line}”</span></div></div>
  <div class="story-chips"><span>📘 ${S.level==="All levels"?"All levels":S.level+" questions"}</span><span>❓ ${n} questions</span><span>❤️ ${HEARTS} hearts</span><span>🎯 Win with ${PASS_PERCENT}%+</span></div>`;
 showScreen("story");
}
// Story → Quick review → Battle
$("beginBattle").onclick=()=>{renderLesson();showScreen("lesson");};
function renderLesson(){
 const L=LANDS[adv.land],S=L.stages[adv.stage],boss=S.level==="All levels";
 const lesson=LESSONS[L.topic][boss?"Difficult":S.level];
 const tips=boss?topicPointers[L.topic]:lesson.tips;
 $("lessonCard").innerHTML=`<div class="lesson-head ${L.theme}"><span class="lesson-icon" aria-hidden="true">📖</span>
   <div><small>QUICK REVIEW • ${escapeHtml(L.name.toUpperCase())}${boss?" • BOSS":""}</small><b>${escapeHtml(boss?`Everything about ${L.topic}`:lesson.title)}</b></div></div>
  <div class="lesson-body">
   <h3 class="rv-h">💡 Remember</h3>
   <ul class="lesson-tips">${tips.map(t=>`<li>${escapeHtml(t)}</li>`).join("")}</ul>
   <h3 class="rv-h">✏️ Try it first</h3>
   <div class="lesson-ex"><p class="lesson-q">${escapeHtml(lesson.ex.q)}</p>
    <details><summary>Show the solution</summary>
     <ol>${lesson.ex.steps.map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ol>
     <p class="lesson-ans">Answer: <b>${escapeHtml(lesson.ex.a)}</b></p></details></div>
  </div>`;
}
$("startFight").onclick=()=>{
 const L=LANDS[adv.land],S=L.stages[adv.stage];
 gameMode="Individual";selectChip("mode","Individual");$("teamNames").classList.add("hidden");
 gameTopic=L.topic;gameLevel=S.level;selectChip("topic",gameTopic);selectChip("level",gameLevel);
 startGame("Adventure");
};
let battleSeq=0;
function setupBattle(){
 adv.hearts=HEARTS;adv.hp=adv.maxHp=gameQuestions.length;adv.streak=0;adv.token=++battleSeq;
 $("battle").className=`battle ${LANDS[adv.land].theme}`;
 $("heroIcon").className="f-icon";$("foeIcon").className="f-icon";
 renderBattle();
}
function renderBattle(){
 const S=LANDS[adv.land].stages[adv.stage];
 $("heroIcon").textContent=avatar;$("heroName").textContent=nameA;
 $("heroHearts").textContent="❤️".repeat(adv.hearts)+"🖤".repeat(HEARTS-adv.hearts);
 $("foeIcon").textContent=S.foeIcon;$("foeName").textContent=S.foe;
 $("foeHp").style.width=`${adv.hp/adv.maxHp*100}%`;
}
function replayAnim(el,cls){el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);}

// --- Attack effects: projectile, slash, sparks, floating damage, screen shake, knock-out ---
function centerOf(el){const r=el.getBoundingClientRect(),b=$("battle").getBoundingClientRect();return {x:r.left+r.width/2-b.left,y:r.top+r.height/2-b.top};}
function fx(cls,text,p,life,vars){
 const s=document.createElement("span");s.className="fx "+cls;s.textContent=text||"";s.setAttribute("aria-hidden","true");
 s.style.left=p.x+"px";s.style.top=p.y+"px";
 if(vars)for(const k in vars)s.style.setProperty(k,vars[k]);
 $("battle").appendChild(s);setTimeout(()=>s.remove(),life);
}
function sparks(p,color,n){for(let i=0;i<n;i++){const a=i/n*Math.PI*2,r=44+(i%3)*14;fx("spark","",p,650,{"--dx":Math.cos(a)*r+"px","--dy":Math.sin(a)*r+"px","--c":color});}}
// Runs fn after ms, but only if the same battle is still going (a retry starts a new one).
function later(ms,token,fn){setTimeout(()=>{if(adv&&adv.token===token)fn();},ms);}
// Full-screen strike: hero and monster fill the screen, a beam and projectile fly across, flash, big text.
// Hero strike on every right answer, monster strike on every wrong answer (Adventure mode).
// Hero strike (onDone given): plays, then holds on its last frame until the player taps "TAP TO CONTINUE";
// onDone runs when it closes. Monster strike: closes by itself (tap skips it).
let strikeTimer=null,strikeDone=null,strikeReadyAt=0;
function openStrike(cls,proj,text,sub,long,onDone){
 const el=$("strike"),L=LANDS[adv.land],S=L.stages[adv.stage],hold=!!onDone;
 el.className="strike hidden";void el.offsetWidth; // restart the animation if one is still showing
 el.className=`strike ${L.theme} ${cls}${hold?" hold":""}`;
 el.innerHTML=`<div class="strike-lines"></div>
  <div class="strike-hero"><span>${avatar}</span></div>
  <div class="strike-beam"></div>
  <div class="strike-proj">${proj}</div>
  <div class="strike-foe"><span>${S.foeIcon}</span></div>
  <div class="strike-boom">💥</div>
  <div class="strike-flash"></div>
  <div class="strike-text">${text}<small>${sub}</small></div>
  <div class="strike-skip">${hold?"TAP TO CONTINUE ▶":"tap to continue"}</div>`;
 clearTimeout(strikeTimer);strikeDone=onDone||null;
 if(hold)strikeReadyAt=Date.now()+(long?1300:1000); // taps before this are ignored so the hit always lands
 else strikeTimer=setTimeout(hideStrike,long?1900:1500);
}
function showStrike(crit,ko,onDone){
 const S=LANDS[adv.land].stages[adv.stage];
 openStrike(`${crit?"crit":""}${ko?" ko":""}`,crit?"🔥":"⚡",
  ko?"K.O.!":crit?"CRITICAL HIT!":"DIRECT HIT!",
  ko?`${S.foe} is defeated!`:crit?`${adv.streak} in a row! −1 HP`:"−1 HP",ko,onDone);
 Sound.sfx("whoosh");setTimeout(()=>Sound.sfx(ko?"ko":"hit"),560);
}
function showFoeStrike(down){
 const S=LANDS[adv.land].stages[adv.stage];
 openStrike(`enemy${down?" down":""}`,"☄️",
  down?"KNOCKED OUT!":"OUCH!",
  down?`${S.foe} wins this round!`:`${S.foe} attacks! −1 ❤️`,down);
 Sound.sfx("roar");setTimeout(()=>Sound.sfx("hurt"),560);if(down)setTimeout(()=>Sound.sfx("ko"),900);
}
function hideStrike(){
 const el=$("strike");
 if(el.classList.contains("hold")&&Date.now()<strikeReadyAt)return; // let the attack finish first
 clearTimeout(strikeTimer);el.className="strike hidden";el.innerHTML="";
 const done=strikeDone;strikeDone=null;if(done)done();
}
$("strike").onclick=hideStrike;
// Keyboard: Enter or Space also continues
document.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&!$("strike").classList.contains("hidden")){e.preventDefault();hideStrike();}});
function battleHit(correct){
 const token=adv.token,hero=$("heroIcon"),foe=$("foeIcon"),box=$("battle");
 if(correct){
  adv.hp=Math.max(0,adv.hp-1);adv.streak=(adv.streak||0)+1;
  const crit=adv.streak>=3,ko=adv.hp===0;
  replayAnim(hero,"attack");
  // Full-screen strike (plays its own sounds). It waits for "tap to continue"; then the battle bar takes the hit.
  showStrike(crit,ko,()=>{
   if(!adv||adv.token!==token)return;
   const from=centerOf(hero),to=centerOf(foe);
   replayAnim(foe,"hit");replayAnim(box,"shake");
   fx("slash","",to,420);if(crit)fx("slash slash2","",to,420);
   sparks(to,crit?"#fb923c":"#fde047",crit?14:10);
   fx("dmg"+(crit?" crit":""),crit?"CRITICAL!":"−1 HP",{x:to.x,y:to.y-28},1000);
   if(adv.streak>=2)fx("dmg combo",`COMBO ×${adv.streak}`,{x:from.x,y:from.y-44},1000);
   renderBattle();
   if(ko)later(260,token,()=>{foe.classList.add("ko");fx("boom","💥",to,900);sparks(to,"#f472b6",16);});
  });
 }else{
  adv.hearts=Math.max(0,adv.hearts-1);adv.streak=0;
  const down=adv.hearts===0;
  replayAnim(foe,"attack-left");
  showFoeStrike(down); // full-screen monster strike (plays its own sounds); the battle bar reacts once it clears
  later(down?1750:1350,token,()=>{
   const to=centerOf(hero);
   replayAnim(hero,"hurt");replayAnim(box,"shake");replayAnim(box,"flash-red");
   sparks(to,"#f43f5e",8);
   fx("dmg ouch","−1 ❤️",{x:to.x,y:to.y-28},1000);
   renderBattle();
   if(down)later(260,token,()=>{hero.classList.add("ko");fx("boom","💔",to,900);});
  });
 }
}
function finishAdventure(pct){
 const L=LANDS[adv.land],S=L.stages[adv.stage],p=loadProgress(),key=stageKey(adv.land,adv.stage);
 const won=pct>=PASS_PERCENT&&adv.hearts>0,first=won&&!p.stars[key];
 const stars=won?(pct===100?3:pct>=90?2:1):0,xp=scoreA+(first?20:0);
 p.xp+=xp;if(stars>(p.stars[key]||0))p.stars[key]=stars;saveProgress(p);
 let unlock="";
 if(first){
  if(adv.stage<2)unlock=`🗺️ New stage unlocked: <b>${L.stages[adv.stage+1].name}</b>`;
  else if(adv.land<LANDS.length-1)unlock=`🎉 ${L.name} conquered! <b>${LANDS[adv.land+1].name}</b> is now open.`;
  else unlock=`👑 You conquered every land! You are a true <b>Grade 7 Math Hero</b>!`;
 }
 Sound.sfx(won?"win":"lose");
 $("resultEyebrow").textContent=won?"VICTORY":"DEFEATED";
 $("resultIcon").textContent=won?"🏆":S.foeIcon;
 $("resultTitle").textContent=won?`You defeated ${S.foe}!`:adv.hearts===0?`Out of hearts! ${S.foe} wins this round.`:`${S.foe} escaped this time!`;
 $("advResult").innerHTML=`<div class="adv-reward">${won?`<div class="big-stars">${starText(stars)}</div>`:""}
  <span class="xp-chip">+${xp} XP${first?" (includes +20 first-clear bonus)":""}</span>${unlock?`<p class="unlock">${unlock}</p>`:""}</div>`;
 $("toMap").classList.remove("hidden");$("toMap").textContent=won?"CONTINUE ADVENTURE ➜":"BACK TO QUEST MAP";
 $("playAgain").textContent=won?"REPLAY STAGE":"TRY AGAIN";
 $("playAgain").className=`btn ${won?"secondary":"primary"} full big`;
}
function resetResultExtras(){
 $("resultEyebrow").textContent="CHALLENGE COMPLETE";$("advResult").innerHTML="";
 $("toMap").classList.add("hidden");$("playAgain").textContent="PLAY AGAIN";$("playAgain").className="btn primary full big";
}
document.querySelectorAll("[data-avatar]").forEach(b=>{
 b.classList.toggle("chosen",b.dataset.avatar===avatar);
 b.onclick=()=>{avatar=b.dataset.avatar;try{localStorage.setItem("iq_avatar",avatar);}catch(e){}document.querySelectorAll("[data-avatar]").forEach(x=>x.classList.toggle("chosen",x===b));};
});
$("toMap").onclick=()=>showScreen("map");

const questionBank = [
 {topic:"Fractions",level:"Easy",prompt:"Add: 2/7 + 3/7",options:["5/7","5/14","6/7","1/7"],answer:"5/7",explanation:"Same denominator: add the numerators (2 + 3 = 5) and copy the denominator: 5/7."},
 {topic:"Fractions",level:"Easy",prompt:"Add and write in lowest terms: 5/12 + 1/12",options:["1/2","1/4","6/24","2/3"],answer:"1/2",explanation:"5 + 1 = 6, so 6/12. Divide 6 and 12 by their greatest common factor, 6: 1/2."},
 {topic:"Fractions",level:"Easy",prompt:"Subtract and write in lowest terms: 7/9 − 4/9",options:["1/3","3/18","11/9","2/3"],answer:"1/3",explanation:"Subtract the numerators and copy the denominator: 7 − 4 = 3, so 3/9. Divide both by 3: 1/3."},
 {topic:"Fractions",level:"Easy",prompt:"Subtract: 1 − 3/8",options:["5/8","3/8","2/8","1/2"],answer:"5/8",explanation:"Write 1 as 8/8. Then 8/8 − 3/8 = 5/8."},
 {topic:"Fractions",level:"Easy",prompt:"Add: 2 1/5 + 3 2/5",options:["5 3/5","5 3/10","6 3/5","1 1/5"],answer:"5 3/5",explanation:"Add the whole numbers (2 + 3 = 5), then the fractions (1/5 + 2/5 = 3/5): 5 3/5."},
 {topic:"Fractions",level:"Easy",prompt:"Subtract and write in lowest terms: 6 5/6 − 2 1/6",options:["4 2/3","4 1/3","8 2/3","4 4/12"],answer:"4 2/3",explanation:"6 − 2 = 4 and 5/6 − 1/6 = 4/6. In lowest terms 4/6 = 2/3, so the answer is 4 2/3."},
 {topic:"Fractions",level:"Average",prompt:"Add: 1/2 + 1/3",options:["5/6","2/5","2/6","1/6"],answer:"5/6",explanation:"Make them similar first. The LCD is 6: 1/2 = 3/6 and 1/3 = 2/6. 3/6 + 2/6 = 5/6."},
 {topic:"Fractions",level:"Average",prompt:"Subtract: 3/4 − 2/5",options:["7/20","1","1/20","5/9"],answer:"7/20",explanation:"LCD of 4 and 5 is 20: 3/4 = 15/20 and 2/5 = 8/20. 15 − 8 = 7, so 7/20."},
 {topic:"Fractions",level:"Average",prompt:"Add: 2/3 + 3/4",options:["1 5/12","5/7","17/24","1 1/12"],answer:"1 5/12",explanation:"LCD is 12: 2/3 = 8/12 and 3/4 = 9/12. 8/12 + 9/12 = 17/12 = 1 5/12."},
 {topic:"Fractions",level:"Average",prompt:"Subtract: 3 1/5 − 1 4/5",options:["1 2/5","2 3/5","1 3/5","2 2/5"],answer:"1 2/5",explanation:"1/5 is smaller than 4/5, so regroup: borrow 1 from 3 to get 2 6/5. Then 2 6/5 − 1 4/5 = 1 2/5."},
 {topic:"Fractions",level:"Average",prompt:"Multiply: 2/3 × 3/8",options:["1/4","5/11","1/2","16/9"],answer:"1/4",explanation:"Cancel first: 3 and 3 become 1 and 1; 2 and 8 become 1 and 4. Then 1/1 × 1/4 = 1/4."},
 {topic:"Fractions",level:"Average",prompt:"Multiply: 3/5 × 10/9",options:["2/3","13/14","3/2","6/5"],answer:"2/3",explanation:"Cancel 3 and 9 (÷3) and 5 and 10 (÷5): 1/1 × 2/3 = 2/3."},
 {topic:"Fractions",level:"Difficult",prompt:"Divide: 3/4 ÷ 3/8",options:["2","9/32","1/2","4"],answer:"2",explanation:"Change the divisor to its reciprocal and multiply: 3/4 × 8/3 = 24/12 = 2."},
 {topic:"Fractions",level:"Difficult",prompt:"Multiply: 1 1/2 × 2 2/3",options:["4","2 1/3","3 1/3","2"],answer:"4",explanation:"Change to improper fractions: 3/2 × 8/3. Cancel the 3s: 8/2 = 4."},
 {topic:"Fractions",level:"Difficult",prompt:"Divide: 2 1/4 ÷ 1 1/2",options:["1 1/2","3 3/8","2/3","1 1/4"],answer:"1 1/2",explanation:"Change to improper fractions: 9/4 ÷ 3/2. Multiply by the reciprocal: 9/4 × 2/3 = 18/12 = 3/2 = 1 1/2."},
 {topic:"Fractions",level:"Difficult",prompt:"Lina jogged 2/5 km in the morning and 1/4 km in the afternoon. How far did she jog in all?",options:["13/20 km","3/9 km","3/20 km","1/10 km"],answer:"13/20 km",explanation:"'In all' means add. LCD is 20: 2/5 = 8/20 and 1/4 = 5/20. 8/20 + 5/20 = 13/20 km."},
 {topic:"Fractions",level:"Difficult",prompt:"A ribbon 6 m long is cut into pieces that are each 3/4 m long. How many pieces are there?",options:["8","4 1/2","18","24"],answer:"8",explanation:"'How many 3/4 in 6' means divide: 6 ÷ 3/4 = 6 × 4/3 = 24/3 = 8 pieces."},
 {topic:"Fractions",level:"Difficult",prompt:"There was 3/4 of a pizza left. Ben ate 2/3 of what was left. What part of the whole pizza did Ben eat?",options:["1/2","1/12","5/7","17/12"],answer:"1/2",explanation:"'2/3 of' means multiply: 2/3 × 3/4 = 6/12 = 1/2 of the whole pizza."},
 {topic:"Decimals",level:"Easy",prompt:"Add: 12.45 + 3.2",options:["15.65","12.77","44.45","15.47"],answer:"15.65",explanation:"Line up the decimal points and fill in a zero: 12.45 + 3.20 = 15.65."},
 {topic:"Decimals",level:"Easy",prompt:"Subtract: 8.5 − 2.75",options:["5.75","6.25","6.75","5.25"],answer:"5.75",explanation:"Write 8.5 as 8.50 so the places line up: 8.50 − 2.75 = 5.75."},
 {topic:"Decimals",level:"Easy",prompt:"Add: 4.6 + 2.35 + 1.05",options:["8","7.9","8.1","7.36"],answer:"8",explanation:"Line up the points: 4.60 + 2.35 + 1.05 = 8.00, which is 8."},
 {topic:"Decimals",level:"Easy",prompt:"Subtract: 50 − 12.4",options:["37.6","38.6","62.4","12.36"],answer:"37.6",explanation:"Write 50 as 50.0, line up the points, and regroup: 50.0 − 12.4 = 37.6."},
 {topic:"Decimals",level:"Easy",prompt:"Divide: 4.56 ÷ 10",options:["0.456","45.6","0.0456","4.56"],answer:"0.456",explanation:"Dividing by 10 moves the decimal point 1 place to the left: 4.56 → 0.456."},
 {topic:"Decimals",level:"Easy",prompt:"Divide: 37.2 ÷ 100",options:["0.372","3.72","3720","0.0372"],answer:"0.372",explanation:"Dividing by 100 moves the decimal point 2 places to the left: 37.2 → 0.372."},
 {topic:"Decimals",level:"Average",prompt:"Multiply: 2.4 × 0.3",options:["0.72","7.2","0.072","72"],answer:"0.72",explanation:"Multiply as whole numbers: 24 × 3 = 72. The factors have 1 + 1 = 2 decimal places, so the product is 0.72."},
 {topic:"Decimals",level:"Average",prompt:"Multiply: 1.25 × 6",options:["7.5","0.75","75","7.25"],answer:"7.5",explanation:"125 × 6 = 750. The factors have 2 decimal places in all: 7.50 = 7.5."},
 {topic:"Decimals",level:"Average",prompt:"Divide: 7.2 ÷ 4",options:["1.8","18","0.18","2.8"],answer:"1.8",explanation:"Divide as usual and put the decimal point straight above the point in the dividend: 7.2 ÷ 4 = 1.8."},
 {topic:"Decimals",level:"Average",prompt:"Divide: 0.63 ÷ 0.1",options:["6.3","0.063","63","0.63"],answer:"6.3",explanation:"Dividing by 0.1 moves the decimal point 1 place to the right: 0.63 → 6.3."},
 {topic:"Decimals",level:"Average",prompt:"Divide: 0.045 ÷ 0.01",options:["4.5","0.45","45","0.00045"],answer:"4.5",explanation:"Dividing by 0.01 moves the decimal point 2 places to the right: 0.045 → 4.5."},
 {topic:"Decimals",level:"Average",prompt:"Subtract: 25.3 − 7.86",options:["17.44","18.44","17.56","33.16"],answer:"17.44",explanation:"Write 25.3 as 25.30, line up the points and regroup: 25.30 − 7.86 = 17.44."},
 {topic:"Decimals",level:"Difficult",prompt:"Divide: 4.8 ÷ 0.06",options:["80","8","0.8","800"],answer:"80",explanation:"Make the divisor a whole number: move both decimal points 2 places right. 480 ÷ 6 = 80."},
 {topic:"Decimals",level:"Difficult",prompt:"Divide: 0.312 ÷ 0.001",options:["312","31.2","0.000312","3.12"],answer:"312",explanation:"Dividing by 0.001 moves the decimal point 3 places to the right: 0.312 → 312."},
 {topic:"Decimals",level:"Difficult",prompt:"Multiply: 0.36 × 0.05",options:["0.018","0.18","1.8","0.0018"],answer:"0.018",explanation:"36 × 5 = 180. There are 2 + 2 = 4 decimal places: 0.0180 = 0.018."},
 {topic:"Decimals",level:"Difficult",prompt:"Divide and round to the nearest hundredth: 25 ÷ 1.5",options:["16.67","16.66","1.67","166.67"],answer:"16.67",explanation:"Move the points 1 place right: 250 ÷ 15 = 16.666… The thousandths digit is 6, so round up: 16.67."},
 {topic:"Decimals",level:"Difficult",prompt:"Mia bought a notebook for ₱35.75 and a pen for ₱12.50. She paid with ₱100. How much change did she get?",options:["₱51.75","₱48.25","₱52.25","₱61.75"],answer:"₱51.75",explanation:"Total cost: 35.75 + 12.50 = ₱48.25. Change: 100.00 − 48.25 = ₱51.75."},
 {topic:"Decimals",level:"Difficult",prompt:"One kilo of rice costs ₱52.40. How much do 2.5 kilos cost?",options:["₱131.00","₱104.80","₱13.10","₱126.00"],answer:"₱131.00",explanation:"52.40 × 2.5: 5240 × 25 = 131000, with 3 decimal places → 131.000 = ₱131.00."},
 {topic:"Geometry",level:"Easy",prompt:"A prism whose two bases are triangles is called a ___.",options:["Triangular prism","Triangular pyramid","Rectangular prism","Cone"],answer:"Triangular prism",explanation:"A prism is named after the shape of its bases. Triangle bases make a triangular prism."},
 {topic:"Geometry",level:"Easy",prompt:"How many faces does a cube have?",options:["6","4","8","12"],answer:"6",explanation:"A cube has 6 equal square faces."},
 {topic:"Geometry",level:"Easy",prompt:"The lateral faces of a pyramid are always ___.",options:["Triangles","Rectangles","Circles","Squares"],answer:"Triangles",explanation:"Whatever the base, every lateral face of a pyramid is a triangle, and they meet at the apex."},
 {topic:"Geometry",level:"Easy",prompt:"Which of these is a plane (flat) figure, not a solid figure?",options:["Circle","Sphere","Cylinder","Cone"],answer:"Circle",explanation:"Plane figures are flat: circle, square, triangle. Solid figures are three-dimensional: sphere, cylinder, cone."},
 {topic:"Geometry",level:"Easy",prompt:"A can of sardines is shaped like a ___.",options:["Cylinder","Cone","Sphere","Pyramid"],answer:"Cylinder",explanation:"A cylinder has two parallel, equal circular bases, just like a can."},
 {topic:"Geometry",level:"Easy",prompt:"A sphere has a radius of 7 cm. How far is its center from any point on the sphere?",options:["7 cm","14 cm","3.5 cm","21 cm"],answer:"7 cm",explanation:"Every point of a sphere is the same distance from the center. That distance is the radius: 7 cm."},
 {topic:"Geometry",level:"Average",prompt:"Find the surface area of a cube with side 4 cm. (SA = 6s²)",options:["96 cm²","64 cm²","24 cm²","16 cm²"],answer:"96 cm²",explanation:"SA = 6 × 4 × 4 = 6 × 16 = 96 cm²."},
 {topic:"Geometry",level:"Average",prompt:"Find the surface area of a rectangular prism with l = 5 cm, w = 3 cm and h = 2 cm. (SA = 2(lw + lh + wh))",options:["62 cm²","30 cm²","31 cm²","124 cm²"],answer:"62 cm²",explanation:"lw = 15, lh = 10, wh = 6. SA = 2(15 + 10 + 6) = 2 × 31 = 62 cm²."},
 {topic:"Geometry",level:"Average",prompt:"A figure is a rectangle 8 cm by 5 cm with a triangle on top (base 8 cm, height 3 cm). What is its total area?",options:["52 cm²","64 cm²","43 cm²","40 cm²"],answer:"52 cm²",explanation:"Split the figure. Rectangle: 8 × 5 = 40 cm². Triangle: ½ × 8 × 3 = 12 cm². Total: 40 + 12 = 52 cm²."},
 {topic:"Geometry",level:"Average",prompt:"A square garden is 10 m on each side. A square pool 4 m on each side is inside it. What is the area of the garden without the pool?",options:["84 m²","96 m²","116 m²","60 m²"],answer:"84 m²",explanation:"Subtract the hole: 10 × 10 − 4 × 4 = 100 − 16 = 84 m²."},
 {topic:"Geometry",level:"Average",prompt:"A stage is a rectangle 10 m by 4 m with a semicircle of radius 2 m on one end. What is its total area? (Use π = 3.14)",options:["46.28 m²","52.56 m²","42 m²","43.14 m²"],answer:"46.28 m²",explanation:"Rectangle: 10 × 4 = 40 m². Semicircle: ½ × 3.14 × 2 × 2 = 6.28 m². Total: 46.28 m²."},
 {topic:"Geometry",level:"Average",prompt:"Which formula gives the surface area of a cube?",options:["6s²","s³","4s","s² + 2bh"],answer:"6s²",explanation:"A cube has 6 square faces, each with area s × s, so SA = 6s²."},
 {topic:"Geometry",level:"Difficult",prompt:"Find the surface area of a cylinder with r = 2 cm and h = 5 cm. (SA = 2πr² + 2πrh, π = 3.14)",options:["87.92 cm²","62.8 cm²","75.36 cm²","43.96 cm²"],answer:"87.92 cm²",explanation:"Two bases: 2 × 3.14 × 2 × 2 = 25.12. Side: 2 × 3.14 × 2 × 5 = 62.8. Total: 25.12 + 62.8 = 87.92 cm²."},
 {topic:"Geometry",level:"Difficult",prompt:"Find the surface area of a sphere with r = 5 cm. (SA = 4πr², π = 3.14)",options:["314 cm²","78.5 cm²","62.8 cm²","1256 cm²"],answer:"314 cm²",explanation:"SA = 4 × 3.14 × 5 × 5 = 12.56 × 25 = 314 cm²."},
 {topic:"Geometry",level:"Difficult",prompt:"Find the surface area of a cone with r = 3 cm and slant height s = 6 cm. (SA = πrs + πr², π = 3.14)",options:["84.78 cm²","56.52 cm²","113.04 cm²","28.26 cm²"],answer:"84.78 cm²",explanation:"Curved surface: 3.14 × 3 × 6 = 56.52. Base: 3.14 × 3 × 3 = 28.26. Total: 84.78 cm²."},
 {topic:"Geometry",level:"Difficult",prompt:"Find the surface area of a square pyramid with base edge b = 6 cm and slant height h = 5 cm. (SA = b² + 2bh)",options:["96 cm²","66 cm²","180 cm²","156 cm²"],answer:"96 cm²",explanation:"Base: 6 × 6 = 36. Four triangles: 2 × 6 × 5 = 60. Total: 36 + 60 = 96 cm²."},
 {topic:"Geometry",level:"Difficult",prompt:"A triangular prism has a triangle with base b = 6 cm and height h = 4 cm, slant sides s = 5 cm, and length l = 10 cm. Find its surface area. (SA = bh + 2ls + lb)",options:["184 cm²","160 cm²","124 cm²","240 cm²"],answer:"184 cm²",explanation:"bh = 6 × 4 = 24 (both triangles). 2ls = 2 × 10 × 5 = 100. lb = 10 × 6 = 60. Total: 24 + 100 + 60 = 184 cm²."},
 {topic:"Geometry",level:"Difficult",prompt:"A gift box is 20 cm long, 10 cm wide and 5 cm high. How much wrapping paper covers it exactly?",options:["700 cm²","1000 cm²","350 cm²","35 cm²"],answer:"700 cm²",explanation:"Find the surface area: 2(20 × 10 + 20 × 5 + 10 × 5) = 2(200 + 100 + 50) = 700 cm²."},
 {topic:"Speed",level:"Easy",prompt:"Is 60 km/h a speed, a distance, or a time?",options:["Speed","Distance","Time","Area"],answer:"Speed",explanation:"Units like km/h, m/s and mph measure speed: distance traveled per unit of time."},
 {topic:"Speed",level:"Easy",prompt:"Is 45 minutes a speed, a distance, or a time?",options:["Time","Speed","Distance","Area"],answer:"Time",explanation:"Seconds, minutes and hours measure time."},
 {topic:"Speed",level:"Easy",prompt:"Is 12 km a speed, a distance, or a time?",options:["Distance","Speed","Time","Area"],answer:"Distance",explanation:"Meters and kilometers measure distance."},
 {topic:"Speed",level:"Easy",prompt:"Which formula finds speed?",options:["S = D ÷ T","S = D × T","S = T ÷ D","S = D + T"],answer:"S = D ÷ T",explanation:"Speed = distance ÷ time. In the D-S-T triangle, D sits on top of S and T."},
 {topic:"Speed",level:"Easy",prompt:"Which formula finds distance?",options:["D = S × T","D = S ÷ T","D = T ÷ S","D = S + T"],answer:"D = S × T",explanation:"Distance = speed × time. In the D-S-T triangle, S and T sit side by side, so multiply."},
 {topic:"Speed",level:"Easy",prompt:"A car travels 100 km in 2 hours. What is its speed?",options:["50 km/h","200 km/h","102 km/h","98 km/h"],answer:"50 km/h",explanation:"S = D ÷ T = 100 ÷ 2 = 50 km/h."},
 {topic:"Speed",level:"Average",prompt:"A bus travels at 60 km/h for 3 hours. How far does it go?",options:["180 km","20 km","63 km","57 km"],answer:"180 km",explanation:"D = S × T = 60 × 3 = 180 km."},
 {topic:"Speed",level:"Average",prompt:"A cyclist rides 36 km at 12 km/h. How long does the ride take?",options:["3 hours","4 hours","24 hours","48 hours"],answer:"3 hours",explanation:"T = D ÷ S = 36 ÷ 12 = 3 hours."},
 {topic:"Speed",level:"Average",prompt:"A runner covers 400 m in 50 seconds. What is the average speed?",options:["8 m/s","80 m/s","0.8 m/s","0.125 m/s"],answer:"8 m/s",explanation:"S = D ÷ T = 400 ÷ 50 = 8 m/s."},
 {topic:"Speed",level:"Average",prompt:"A jeepney travels at 30 km/h for 1.5 hours. How far does it travel?",options:["45 km","20 km","31.5 km","4.5 km"],answer:"45 km",explanation:"D = S × T = 30 × 1.5 = 45 km."},
 {topic:"Speed",level:"Average",prompt:"A tricycle goes 8 km at 16 km/h. How many minutes does the trip take?",options:["30 minutes","2 minutes","50 minutes","20 minutes"],answer:"30 minutes",explanation:"T = D ÷ S = 8 ÷ 16 = 0.5 hour. 0.5 × 60 = 30 minutes."},
 {topic:"Speed",level:"Average",prompt:"A train covers 240 km in 3 hours at 80 km/h. Which value is the distance?",options:["240 km","3 hours","80 km/h","720 km"],answer:"240 km",explanation:"Distance uses length units such as m or km, so the distance is 240 km."},
 {topic:"Speed",level:"Difficult",prompt:"A ferry leaves at 9:30 AM and travels 20 km at 40 km/h. What time does it arrive?",options:["10:00 AM","10:30 AM","9:50 AM","11:30 AM"],answer:"10:00 AM",explanation:"T = 20 ÷ 40 = 0.5 hour = 30 minutes. 9:30 AM + 30 minutes = 10:00 AM."},
 {topic:"Speed",level:"Difficult",prompt:"A truck left at 7:00 AM and arrived at 11:00 AM after traveling 220 km. What was its average speed?",options:["55 km/h","44 km/h","73.3 km/h","880 km/h"],answer:"55 km/h",explanation:"7:00 AM to 11:00 AM is 4 hours. S = 220 ÷ 4 = 55 km/h."},
 {topic:"Speed",level:"Difficult",prompt:"Anna walks 2.4 km to school at 4 km/h. How many minutes does it take?",options:["36 minutes","60 minutes","9.6 minutes","24 minutes"],answer:"36 minutes",explanation:"T = 2.4 ÷ 4 = 0.6 hour. 0.6 × 60 = 36 minutes."},
 {topic:"Speed",level:"Difficult",prompt:"A car travels 90 km at 60 km/h, then 40 km at 40 km/h. How long is the whole trip?",options:["2.5 hours","2 hours","3.25 hours","1.3 hours"],answer:"2.5 hours",explanation:"Part 1: 90 ÷ 60 = 1.5 hours. Part 2: 40 ÷ 40 = 1 hour. Total: 1.5 + 1 = 2.5 hours."},
 {topic:"Speed",level:"Difficult",prompt:"A van travels 120 km in 2.5 hours. What is its average speed?",options:["48 km/h","300 km/h","50 km/h","60 km/h"],answer:"48 km/h",explanation:"S = D ÷ T = 120 ÷ 2.5 = 48 km/h."},
 {topic:"Speed",level:"Difficult",prompt:"A boat goes 15 km in 45 minutes. What is its speed in km/h?",options:["20 km/h","0.33 km/h","11.25 km/h","3 km/h"],answer:"20 km/h",explanation:"45 minutes = 0.75 hour. S = 15 ÷ 0.75 = 20 km/h."},
 {topic:"Outcomes",level:"Easy",prompt:"A coin is tossed once. How many possible outcomes are there?",options:["2","1","4","6"],answer:"2",explanation:"The outcomes are Heads (H) and Tails (T): 2 outcomes."},
 {topic:"Outcomes",level:"Easy",prompt:"A standard die is rolled once. How many possible outcomes are there?",options:["6","1","12","36"],answer:"6",explanation:"The die can land on 1, 2, 3, 4, 5 or 6: 6 outcomes."},
 {topic:"Outcomes",level:"Easy",prompt:"Which list shows ALL outcomes of tossing two coins?",options:["HH, HT, TH, TT","HH, TT","HT, TH","HH, HT, TT"],answer:"HH, HT, TH, TT",explanation:"Pair each result of the first coin with each result of the second: HH, HT, TH, TT."},
 {topic:"Outcomes",level:"Easy",prompt:"Rica has 2 skirts and 3 blouses. How many skirt-and-blouse outfits can she make?",options:["6","5","3","9"],answer:"6",explanation:"Each of the 2 skirts can go with each of the 3 blouses: 2 × 3 = 6 outfits."},
 {topic:"Outcomes",level:"Easy",prompt:"A spinner has 4 colors: red, blue, green and yellow. How many outcomes are there for one spin?",options:["4","1","2","8"],answer:"4",explanation:"The spinner can land on any of the 4 colors: 4 outcomes."},
 {topic:"Outcomes",level:"Easy",prompt:"A lunch has 1 rice (plain or fried) and 1 viand (adobo or sinigang). Which is NOT a possible outcome?",options:["Fried rice; tinola","Plain rice; adobo","Fried rice; sinigang","Plain rice; sinigang"],answer:"Fried rice; tinola",explanation:"Tinola is not one of the viand choices, so it cannot be part of an outcome."},
 {topic:"Outcomes",level:"Average",prompt:"A coin is tossed and a die is rolled. How many outcomes are there?",options:["12","8","6","36"],answer:"12",explanation:"Each of the 2 coin results pairs with each of the 6 die results: 2 × 6 = 12."},
 {topic:"Outcomes",level:"Average",prompt:"A locker code uses 1 letter (A, B or C) then 1 digit (1 or 2). How many codes can be made?",options:["6","5","3","9"],answer:"6",explanation:"List them: A1, A2, B1, B2, C1, C2. That is 3 × 2 = 6 codes."},
 {topic:"Outcomes",level:"Average",prompt:"Two dice are rolled. How many outcomes show two odd numbers?",options:["9","3","6","36"],answer:"9",explanation:"Each die has 3 odd numbers (1, 3, 5). Pairs: 3 × 3 = 9."},
 {topic:"Outcomes",level:"Average",prompt:"A tree diagram has 3 branches for the first choice, and each of those splits into 4 branches. How many outcomes are at the ends?",options:["12","7","4","3"],answer:"12",explanation:"Each of the 3 first branches ends in 4 outcomes: 3 × 4 = 12."},
 {topic:"Outcomes",level:"Average",prompt:"A class elects 1 president (Ana or Ben) and 1 secretary (Cy, Dan or Eva). Which outcome is possible?",options:["Ben, Eva","Ana, Ben","Cy, Dan","Eva, Eva"],answer:"Ben, Eva",explanation:"An outcome pairs one president candidate with one secretary candidate: Ben (president) and Eva (secretary)."},
 {topic:"Outcomes",level:"Average",prompt:"A bag has 1 red, 1 white and 1 blue marble. Two marbles are drawn at the same time. How many different pairs are possible?",options:["3","6","9","2"],answer:"3",explanation:"Drawn together, the order does not matter: red-white, red-blue, white-blue. That is 3 pairs."},
 {topic:"Outcomes",level:"Difficult",prompt:"A coin is tossed 3 times. How many outcomes are in the sample space?",options:["8","6","9","3"],answer:"8",explanation:"2 × 2 × 2 = 8: HHH, HHT, HTH, HTT, THH, THT, TTH, TTT."},
 {topic:"Outcomes",level:"Difficult",prompt:"Ice cream comes in a cup or a cone, in 3 flavors, with 2 toppings. How many combinations of one of each are there?",options:["12","7","6","18"],answer:"12",explanation:"Multiply the choices: 2 × 3 × 2 = 12 combinations."},
 {topic:"Outcomes",level:"Difficult",prompt:"A coin is tossed 3 times. How many outcomes have exactly 2 heads?",options:["3","2","4","6"],answer:"3",explanation:"From the 8 outcomes, the ones with exactly 2 heads are HHT, HTH and THH: 3 outcomes."},
 {topic:"Outcomes",level:"Difficult",prompt:"Two dice are rolled. In how many outcomes is the sum 7?",options:["6","7","5","12"],answer:"6",explanation:"(1,6), (2,5), (3,4), (4,3), (5,2), (6,1): 6 outcomes."},
 {topic:"Outcomes",level:"Difficult",prompt:"A snack stand has 4 drinks. There are 20 possible drink-and-snack combinations. How many snacks does it sell?",options:["5","16","24","80"],answer:"5",explanation:"Drinks × snacks = 20, so snacks = 20 ÷ 4 = 5."},
 {topic:"Outcomes",level:"Difficult",prompt:"A password is 1 letter (A or B), then 1 digit (0–9), then 1 symbol (# or @). How many passwords are possible?",options:["40","14","20","100"],answer:"40",explanation:"Multiply the choices at each step: 2 × 10 × 2 = 40."},
 {topic:"Integers",level:"Easy",prompt:"Add: (−6) + (−9)",options:["−15","15","−3","3"],answer:"−15",explanation:"Same signs: add 6 + 9 = 15 and keep the negative sign: −15."},
 {topic:"Integers",level:"Easy",prompt:"Add: 14 + (−5)",options:["9","−9","19","−19"],answer:"9",explanation:"Different signs: subtract 14 − 5 = 9 and copy the sign of the larger number (14, positive): 9."},
 {topic:"Integers",level:"Easy",prompt:"Add: (−12) + 7",options:["−5","5","−19","19"],answer:"−5",explanation:"Different signs: 12 − 7 = 5. The larger number, 12, is negative, so the answer is −5."},
 {topic:"Integers",level:"Easy",prompt:"Add: (−8) + 8",options:["0","−16","16","−8"],answer:"0",explanation:"A number plus its opposite is zero. Zero has no sign."},
 {topic:"Integers",level:"Easy",prompt:"Add: (−23) + (−17)",options:["−40","40","−6","6"],answer:"−40",explanation:"Same signs: 23 + 17 = 40, keep the negative sign: −40."},
 {topic:"Integers",level:"Easy",prompt:"Add: 35 + (−50)",options:["−15","15","−85","85"],answer:"−15",explanation:"Different signs: 50 − 35 = 15. The larger number, 50, is negative, so −15."},
 {topic:"Integers",level:"Average",prompt:"Subtract: 9 − 15",options:["−6","6","24","−24"],answer:"−6",explanation:"Add the opposite of the subtrahend: 9 + (−15). Different signs: 15 − 9 = 6, sign of 15 (−): −6."},
 {topic:"Integers",level:"Average",prompt:"Subtract: (−7) − (−10)",options:["3","−3","−17","17"],answer:"3",explanation:"Add the opposite of −10: (−7) + 10. Different signs: 10 − 7 = 3, sign of 10 (+): 3."},
 {topic:"Integers",level:"Average",prompt:"Subtract: 12 − (−8)",options:["20","4","−4","−20"],answer:"20",explanation:"Subtracting a negative becomes adding a positive: 12 + 8 = 20."},
 {topic:"Integers",level:"Average",prompt:"Subtract: (−15) − 6",options:["−21","−9","9","21"],answer:"−21",explanation:"Add the opposite of 6: (−15) + (−6). Same signs: 15 + 6 = 21, keep −: −21."},
 {topic:"Integers",level:"Average",prompt:"Subtract: (−20) − (−4)",options:["−16","−24","16","24"],answer:"−16",explanation:"Add the opposite of −4: (−20) + 4. Different signs: 20 − 4 = 16, sign of 20 (−): −16."},
 {topic:"Integers",level:"Average",prompt:"Which addition is the same as 5 − (−3)?",options:["5 + 3","5 + (−3)","(−5) + 3","(−5) + (−3)"],answer:"5 + 3",explanation:"To subtract, add the opposite of the subtrahend. The opposite of −3 is 3, so 5 − (−3) = 5 + 3."},
 {topic:"Integers",level:"Difficult",prompt:"Multiply: (−7) × (−8)",options:["56","−56","15","−15"],answer:"56",explanation:"Same signs give a positive product: 7 × 8 = 56."},
 {topic:"Integers",level:"Difficult",prompt:"Multiply: 9 × (−6)",options:["−54","54","3","−15"],answer:"−54",explanation:"Different signs give a negative product: 9 × 6 = 54, so −54."},
 {topic:"Integers",level:"Difficult",prompt:"Divide: (−72) ÷ 8",options:["−9","9","−64","−80"],answer:"−9",explanation:"Different signs give a negative quotient: 72 ÷ 8 = 9, so −9."},
 {topic:"Integers",level:"Difficult",prompt:"Divide: (−96) ÷ (−12)",options:["8","−8","−84","108"],answer:"8",explanation:"Same signs give a positive quotient: 96 ÷ 12 = 8."},
 {topic:"Integers",level:"Difficult",prompt:"Multiply: (−2) × 5 × (−4)",options:["40","−40","−1","11"],answer:"40",explanation:"There are 2 negative factors (an even number), so the product is positive: 2 × 5 × 4 = 40."},
 {topic:"Integers",level:"Difficult",prompt:"Multiply: (−3/4) × (−2/5)",options:["3/10","−3/10","5/9","−5/9"],answer:"3/10",explanation:"Same signs give a positive product. 3 × 2 = 6 and 4 × 5 = 20: 6/20 = 3/10."}
];

function showScreen(id){if(!canSee(id))id=roleHome(); screens.forEach(s=>$(s).classList.toggle("active",s===id)); if(id==="teacher") loadTeacher(); if(id==="admin") loadAdmin(); if(id==="myprogress") loadMyProgress(); if(id==="account") renderAccount(); if(id==="profile") renderProfile(); if(id==="assessment") updateTestScores(); if(id==="map") renderMap(); if(id==="puzzle"&&typeof trShowIntro==="function") trShowIntro(); window.scrollTo&&window.scrollTo(0,0);}
document.querySelectorAll("[data-screen]").forEach(b=>b.addEventListener("click",()=>showScreen(b.dataset.screen)));
$("startSetup").onclick=()=>{player=heroName();showScreen("map");};

document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{
 gameMode=b.dataset.mode;
 document.querySelectorAll("[data-mode]").forEach(x=>x.classList.toggle("chosen",x===b));
 $("teamNames").classList.toggle("hidden",gameMode!=="Team");
});
document.querySelectorAll("[data-topic]").forEach(b=>b.onclick=()=>{
 gameTopic=b.dataset.topic;document.querySelectorAll("[data-topic]").forEach(x=>x.classList.toggle("chosen",x===b));
});
document.querySelectorAll("[data-level]").forEach(b=>b.onclick=()=>{
 gameLevel=b.dataset.level;document.querySelectorAll("[data-level]").forEach(x=>x.classList.toggle("chosen",x===b));
});
$("play").onclick=()=>startGame("Practice");
document.querySelectorAll("[data-test]").forEach(b=>b.onclick=()=>{gameMode="Individual";gameTopic="Mixed";gameLevel="All levels";startGame(b.dataset.test);});

function startGame(type){
 testType=type;player=heroName();
 if(type!=="Adventure")adv=null;
 nameA=gameMode==="Team"?($("team1").value.trim()||"Player 1"):player;nameB=$("team2").value.trim()||"Player 2";
 const isTest=type==="Pre-test"||type==="Post-test";
 gameQuestions=pickQuestions(gameTopic,gameLevel,isTest?10:8,!isTest);
 current=0;scoreA=0;scoreB=0;turn=1;selected=null;checked=false;missed=[];
 $("exitGame").dataset.screen=adv?"map":"home";
 $("battle").classList.toggle("hidden",!adv);
 if(adv)setupBattle();
 showScreen("game");renderQuestion();
}
function renderQuestion(){
 const q=gameQuestions[current];selected=null;checked=false;
 $("progressText").textContent=`QUESTION ${current+1} / ${gameQuestions.length}`;
 $("progressBar").style.width=`${(current+1)/gameQuestions.length*100}%`;
 $("topicTag").textContent=`${q.topic.toUpperCase()} • ${q.level.toUpperCase()}`;
 $("questionText").textContent=q.prompt;
 $("turnLabel").textContent=gameMode==="Team"?`Turn: ${turn===1?nameA:nameB}`:nameA;
 updateScore();
 $("feedback").classList.add("hidden");$("checkAnswer").disabled=true;$("checkAnswer").textContent="CHECK ANSWER";
 $("answers").innerHTML="";
 q.options.forEach(option=>{
  const btn=document.createElement("button");btn.className="answer";btn.textContent=option;
  btn.onclick=()=>{if(checked)return;selected=option;document.querySelectorAll(".answer").forEach(a=>a.classList.toggle("selected",a===btn));$("checkAnswer").disabled=false;};
  $("answers").appendChild(btn);
 });
}
function updateScore(){$("scoreLabel").textContent=gameMode==="Team"?`${nameA}: ${scoreA} • ${nameB}: ${scoreB}`:`${scoreA} points`;}
$("checkAnswer").onclick=()=>{
 if(!checked){
  if(selected===null)return;
  const q=gameQuestions[current],correct=selected===q.answer;
  if(correct){if(gameMode==="Team"&&turn===2)scoreB+=10;else scoreA+=10;}
  else missed.push({q,selected,who:gameMode==="Team"?(turn===1?nameA:nameB):null});
  if(adv)battleHit(correct);
  const outOfHearts=adv&&adv.hearts===0;
  checked=true;
  document.querySelectorAll(".answer").forEach(btn=>{
   if(btn.textContent===q.answer)btn.classList.add("correct");
   else if(btn.textContent===selected)btn.classList.add("wrong");
   btn.disabled=true;
  });
  $("feedback").classList.remove("hidden");
  if(!adv)Sound.sfx(correct?"correct":"wrong");
  const head=correct?(adv?(adv.streak>=3?`Critical hit! ${adv.streak} in a row! +10 XP 🔥`:"Direct hit! +10 XP ⚔️"):"Correct! +10 points ⭐"):(adv?"Ouch! You lost a heart. Correct answer: ":"Good try! Correct answer: ")+escapeHtml(q.answer);
  $("feedback").innerHTML=`<b>${head}</b><br>${escapeHtml(q.explanation)}${outOfHearts?"<br><b>💔 You're out of hearts! Review your mistakes and try again.</b>":""}`;
  $("checkAnswer").textContent=current===gameQuestions.length-1||outOfHearts?"SEE RESULTS":"NEXT QUESTION";
 }else{
  if(current<gameQuestions.length-1&&!(adv&&adv.hearts===0)){current++;if(gameMode==="Team")turn=turn===1?2:1;renderQuestion();}
  else finishGame();
 }
};
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function finishGame(){
 const total=scoreA+scoreB,possible=gameQuestions.length*10;
 if(testType==="Pre-test")preScore=scoreA;
 if(testType==="Post-test")postScore=scoreA;
 $("resultSummary").textContent=gameMode==="Team"?`${nameA}: ${scoreA} points • ${nameB}: ${scoreB} points`:`${nameA} scored ${scoreA} points.`;
 $("resultScore").textContent=`${total} pts`;
 $("resultDetail").textContent=`Maximum available: ${possible} points • ${testType}`;
 renderReview(Math.round(total/possible*100));
 if(!adv)Sound.sfx(total/possible*100>=PASS_PERCENT?"win":"lose");
 if(adv)finishAdventure(Math.round(total/possible*100));else resetResultExtras();
 showScreen("result");
 const payload={playerName:gameMode==="Team"?`${nameA} & ${nameB}`:nameA,mode:gameMode,topic:gameTopic,difficulty:gameLevel,type:testType,score:total,totalQuestions:gameQuestions.length};
 await saveSession(payload);
}
// Games are saved to the logged-in student's account. Offline games wait in a queue (tagged with the
// student's id) and are sent the next time that same student is online and logged in.
function storeQueue(){try{localStorage.setItem("iq_queue",JSON.stringify(localQueue));}catch(e){}}
async function saveSession(payload){
 if(!authUser||authUser.role!=="student")return;
 payload.userId=authUser.id;
 try{await api("/api/sessions",{method:"POST",body:payload});await syncQueue();}
 catch(e){if(e.status===400||e.status===403)return; localQueue.push(payload);storeQueue();}
}
async function syncQueue(){
 if(!authUser||authUser.role!=="student"||!navigator.onLine||!localQueue.length)return;
 const remaining=[];
 for(const item of localQueue){
  if(item.userId!==authUser.id){remaining.push(item);continue;}
  try{await api("/api/sessions",{method:"POST",body:item});}
  catch(e){if(e.status!==400&&e.status!==403)remaining.push(item);} // a refused score is dropped, not retried forever
 }
 localQueue=remaining;storeQueue();
}
$("playAgain").onclick=()=>{if(adv)startGame("Adventure");else showScreen("setup");};

function reviewItemsHtml(){
 return missed.map(({q,selected,who},i)=>`
  <div class="review-item">
   <div class="ri-top"><span class="ri-num">${i+1}</span><span class="ri-tag">${escapeHtml(q.topic.toUpperCase())} • ${escapeHtml(q.level.toUpperCase())}</span>${who?`<span class="ri-who">${escapeHtml(who)}</span>`:""}</div>
   <p class="ri-q">${escapeHtml(q.prompt)}</p>
   <div class="ri-answers"><span class="ri-yours">✕ Your answer: <b>${escapeHtml(selected)}</b></span><span class="ri-right">✓ Correct: <b>${escapeHtml(q.answer)}</b></span></div>
   <p class="ri-why"><b>Why:</b> ${escapeHtml(q.explanation)}</p>
  </div>`).join("");
}
function selectChip(attr,value){document.querySelectorAll(`[data-${attr}]`).forEach(x=>x.classList.toggle("chosen",x.dataset[attr]===value));}
function renderReview(pct){
 const panel=$("reviewPanel"),passed=pct>=PASS_PERCENT;
 $("resultTitle").textContent=passed?(missed.length?"Great effort!":"Perfect score!"):"Keep going — you can do this!";
 $("resultIcon").textContent=passed?"🏆":"📘";
 if(passed){
  panel.innerHTML=missed.length
   ?`<div class="review pass"><p class="rv-banner ok">✓ You scored <b>${pct}%</b> and reached the ${PASS_PERCENT}% target.</p>
     <details><summary>Review the ${missed.length} question${missed.length>1?"s":""} you missed</summary>${reviewItemsHtml()}</details></div>`
   :`<div class="review pass"><p class="rv-banner ok">✓ You scored <b>${pct}%</b> — every answer correct!</p></div>`;
  return;
 }
 // Count misses per topic, weakest first.
 const counts={};missed.forEach(m=>counts[m.q.topic]=(counts[m.q.topic]||0)+1);
 const topics=Object.keys(counts).sort((a,b)=>counts[b]-counts[a]);
 const weakest=topics[0];
 panel.innerHTML=`<div class="review fail">
  <div class="rv-banner warn"><b>You scored ${pct}%. The target is ${PASS_PERCENT}%.</b>
   <span>Don't worry — mistakes help us learn. Read each explanation below, study the pointers, then try again.</span></div>
  <h3 class="rv-h">📝 Questions to review (${missed.length})</h3>
  ${reviewItemsHtml()}
  <h3 class="rv-h">💡 Pointers to study</h3>
  ${topics.map(t=>`<div class="pointer-card"><div class="pc-head"><b>${escapeHtml(t)}</b><small>${counts[t]} missed</small></div>
   <ul>${(topicPointers[t]||[]).map(p=>`<li>${escapeHtml(p)}</li>`).join("")}</ul></div>`).join("")}
  <div class="rv-steps"><b>Before you try again:</b>
   <ol><li>Re-read the questions you missed and say the correct steps out loud.</li>
   <li>Work the problem on paper using the pointers above.</li>
   <li>Practice ${escapeHtml(weakest)} on Easy first, then move up a level.</li></ol></div>
  <button id="practiceWeak" class="btn secondary full">PRACTICE ${escapeHtml(weakest.toUpperCase())} AGAIN</button>
 </div>`;
 $("practiceWeak").onclick=()=>{gameTopic=weakest;gameLevel="All levels";selectChip("topic",weakest);selectChip("level","All levels");startGame("Practice");};
}
// Latest pre-test and post-test come from the student's saved games (so they survive a reload).
function updateTestScores(){
 const show=(pre,post)=>{$("testScores").textContent=`Pre-test: ${pre===null?"not taken":pre+" points"} • Post-test: ${post===null?"not taken":post+" points"}`;};
 show(preScore,postScore);
 if(!authUser||authUser.role!=="student")return;
 api("/api/sessions").then(rows=>{
  const pre=rows.find(r=>r.type==="Pre-test"),post=rows.find(r=>r.type==="Post-test");
  show(pre?pre.score:preScore,post?post.score:postScore);
 }).catch(()=>{});
}
// Teacher and admin dashboards: see loadTeacher / loadAdmin in auth.js.
function updateConnection(){const online=navigator.onLine;$("connection").textContent=online?"● ONLINE":"● OFFLINE";$("connection").style.color=online?"#86efac":"#fcd34d";if(online)syncQueue();}
window.addEventListener("online",updateConnection);window.addEventListener("offline",updateConnection);updateConnection();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
