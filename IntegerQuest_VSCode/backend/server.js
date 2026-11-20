const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 3000;
const mongoClient = new MongoClient(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017");
const databaseName = process.env.MONGODB_DB || "mathinikquest"; // no spaces: MongoDB on Windows rejects them
let sessions, users, logins, progress, resetRequests, avatars;

app.use(cors());
app.use(express.json({ limit: "600kb" })); // room for a profile picture (sent as a small base64 image)

const questions = [
  {id:1,topic:"Fractions",level:"Easy",prompt:"Add: 2/7 + 3/7",options:["5/7","5/14","6/7","1/7"],answer:"5/7",explanation:"Same denominator: add the numerators (2 + 3 = 5) and copy the denominator: 5/7."},
  {id:2,topic:"Fractions",level:"Easy",prompt:"Add and write in lowest terms: 5/12 + 1/12",options:["1/2","1/4","6/24","2/3"],answer:"1/2",explanation:"5 + 1 = 6, so 6/12. Divide 6 and 12 by their greatest common factor, 6: 1/2."},
  {id:3,topic:"Fractions",level:"Easy",prompt:"Subtract and write in lowest terms: 7/9 − 4/9",options:["1/3","3/18","11/9","2/3"],answer:"1/3",explanation:"Subtract the numerators and copy the denominator: 7 − 4 = 3, so 3/9. Divide both by 3: 1/3."},
  {id:4,topic:"Fractions",level:"Easy",prompt:"Subtract: 1 − 3/8",options:["5/8","3/8","2/8","1/2"],answer:"5/8",explanation:"Write 1 as 8/8. Then 8/8 − 3/8 = 5/8."},
  {id:5,topic:"Fractions",level:"Easy",prompt:"Add: 2 1/5 + 3 2/5",options:["5 3/5","5 3/10","6 3/5","1 1/5"],answer:"5 3/5",explanation:"Add the whole numbers (2 + 3 = 5), then the fractions (1/5 + 2/5 = 3/5): 5 3/5."},
  {id:6,topic:"Fractions",level:"Easy",prompt:"Subtract and write in lowest terms: 6 5/6 − 2 1/6",options:["4 2/3","4 1/3","8 2/3","4 4/12"],answer:"4 2/3",explanation:"6 − 2 = 4 and 5/6 − 1/6 = 4/6. In lowest terms 4/6 = 2/3, so the answer is 4 2/3."},
  {id:7,topic:"Fractions",level:"Average",prompt:"Add: 1/2 + 1/3",options:["5/6","2/5","2/6","1/6"],answer:"5/6",explanation:"Make them similar first. The LCD is 6: 1/2 = 3/6 and 1/3 = 2/6. 3/6 + 2/6 = 5/6."},
  {id:8,topic:"Fractions",level:"Average",prompt:"Subtract: 3/4 − 2/5",options:["7/20","1","1/20","5/9"],answer:"7/20",explanation:"LCD of 4 and 5 is 20: 3/4 = 15/20 and 2/5 = 8/20. 15 − 8 = 7, so 7/20."},
  {id:9,topic:"Fractions",level:"Average",prompt:"Add: 2/3 + 3/4",options:["1 5/12","5/7","17/24","1 1/12"],answer:"1 5/12",explanation:"LCD is 12: 2/3 = 8/12 and 3/4 = 9/12. 8/12 + 9/12 = 17/12 = 1 5/12."},
  {id:10,topic:"Fractions",level:"Average",prompt:"Subtract: 3 1/5 − 1 4/5",options:["1 2/5","2 3/5","1 3/5","2 2/5"],answer:"1 2/5",explanation:"1/5 is smaller than 4/5, so regroup: borrow 1 from 3 to get 2 6/5. Then 2 6/5 − 1 4/5 = 1 2/5."},
  {id:11,topic:"Fractions",level:"Average",prompt:"Multiply: 2/3 × 3/8",options:["1/4","5/11","1/2","16/9"],answer:"1/4",explanation:"Cancel first: 3 and 3 become 1 and 1; 2 and 8 become 1 and 4. Then 1/1 × 1/4 = 1/4."},
  {id:12,topic:"Fractions",level:"Average",prompt:"Multiply: 3/5 × 10/9",options:["2/3","13/14","3/2","6/5"],answer:"2/3",explanation:"Cancel 3 and 9 (÷3) and 5 and 10 (÷5): 1/1 × 2/3 = 2/3."},
  {id:13,topic:"Fractions",level:"Difficult",prompt:"Divide: 3/4 ÷ 3/8",options:["2","9/32","1/2","4"],answer:"2",explanation:"Change the divisor to its reciprocal and multiply: 3/4 × 8/3 = 24/12 = 2."},
  {id:14,topic:"Fractions",level:"Difficult",prompt:"Multiply: 1 1/2 × 2 2/3",options:["4","2 1/3","3 1/3","2"],answer:"4",explanation:"Change to improper fractions: 3/2 × 8/3. Cancel the 3s: 8/2 = 4."},
  {id:15,topic:"Fractions",level:"Difficult",prompt:"Divide: 2 1/4 ÷ 1 1/2",options:["1 1/2","3 3/8","2/3","1 1/4"],answer:"1 1/2",explanation:"Change to improper fractions: 9/4 ÷ 3/2. Multiply by the reciprocal: 9/4 × 2/3 = 18/12 = 3/2 = 1 1/2."},
  {id:16,topic:"Fractions",level:"Difficult",prompt:"Lina jogged 2/5 km in the morning and 1/4 km in the afternoon. How far did she jog in all?",options:["13/20 km","3/9 km","3/20 km","1/10 km"],answer:"13/20 km",explanation:"'In all' means add. LCD is 20: 2/5 = 8/20 and 1/4 = 5/20. 8/20 + 5/20 = 13/20 km."},
  {id:17,topic:"Fractions",level:"Difficult",prompt:"A ribbon 6 m long is cut into pieces that are each 3/4 m long. How many pieces are there?",options:["8","4 1/2","18","24"],answer:"8",explanation:"'How many 3/4 in 6' means divide: 6 ÷ 3/4 = 6 × 4/3 = 24/3 = 8 pieces."},
  {id:18,topic:"Fractions",level:"Difficult",prompt:"There was 3/4 of a pizza left. Ben ate 2/3 of what was left. What part of the whole pizza did Ben eat?",options:["1/2","1/12","5/7","17/12"],answer:"1/2",explanation:"'2/3 of' means multiply: 2/3 × 3/4 = 6/12 = 1/2 of the whole pizza."},
  {id:19,topic:"Decimals",level:"Easy",prompt:"Add: 12.45 + 3.2",options:["15.65","12.77","44.45","15.47"],answer:"15.65",explanation:"Line up the decimal points and fill in a zero: 12.45 + 3.20 = 15.65."},
  {id:20,topic:"Decimals",level:"Easy",prompt:"Subtract: 8.5 − 2.75",options:["5.75","6.25","6.75","5.25"],answer:"5.75",explanation:"Write 8.5 as 8.50 so the places line up: 8.50 − 2.75 = 5.75."},
  {id:21,topic:"Decimals",level:"Easy",prompt:"Add: 4.6 + 2.35 + 1.05",options:["8","7.9","8.1","7.36"],answer:"8",explanation:"Line up the points: 4.60 + 2.35 + 1.05 = 8.00, which is 8."},
  {id:22,topic:"Decimals",level:"Easy",prompt:"Subtract: 50 − 12.4",options:["37.6","38.6","62.4","12.36"],answer:"37.6",explanation:"Write 50 as 50.0, line up the points, and regroup: 50.0 − 12.4 = 37.6."},
  {id:23,topic:"Decimals",level:"Easy",prompt:"Divide: 4.56 ÷ 10",options:["0.456","45.6","0.0456","4.56"],answer:"0.456",explanation:"Dividing by 10 moves the decimal point 1 place to the left: 4.56 → 0.456."},
  {id:24,topic:"Decimals",level:"Easy",prompt:"Divide: 37.2 ÷ 100",options:["0.372","3.72","3720","0.0372"],answer:"0.372",explanation:"Dividing by 100 moves the decimal point 2 places to the left: 37.2 → 0.372."},
  {id:25,topic:"Decimals",level:"Average",prompt:"Multiply: 2.4 × 0.3",options:["0.72","7.2","0.072","72"],answer:"0.72",explanation:"Multiply as whole numbers: 24 × 3 = 72. The factors have 1 + 1 = 2 decimal places, so the product is 0.72."},
  {id:26,topic:"Decimals",level:"Average",prompt:"Multiply: 1.25 × 6",options:["7.5","0.75","75","7.25"],answer:"7.5",explanation:"125 × 6 = 750. The factors have 2 decimal places in all: 7.50 = 7.5."},
  {id:27,topic:"Decimals",level:"Average",prompt:"Divide: 7.2 ÷ 4",options:["1.8","18","0.18","2.8"],answer:"1.8",explanation:"Divide as usual and put the decimal point straight above the point in the dividend: 7.2 ÷ 4 = 1.8."},
  {id:28,topic:"Decimals",level:"Average",prompt:"Divide: 0.63 ÷ 0.1",options:["6.3","0.063","63","0.63"],answer:"6.3",explanation:"Dividing by 0.1 moves the decimal point 1 place to the right: 0.63 → 6.3."},
  {id:29,topic:"Decimals",level:"Average",prompt:"Divide: 0.045 ÷ 0.01",options:["4.5","0.45","45","0.00045"],answer:"4.5",explanation:"Dividing by 0.01 moves the decimal point 2 places to the right: 0.045 → 4.5."},
  {id:30,topic:"Decimals",level:"Average",prompt:"Subtract: 25.3 − 7.86",options:["17.44","18.44","17.56","33.16"],answer:"17.44",explanation:"Write 25.3 as 25.30, line up the points and regroup: 25.30 − 7.86 = 17.44."},
  {id:31,topic:"Decimals",level:"Difficult",prompt:"Divide: 4.8 ÷ 0.06",options:["80","8","0.8","800"],answer:"80",explanation:"Make the divisor a whole number: move both decimal points 2 places right. 480 ÷ 6 = 80."},
  {id:32,topic:"Decimals",level:"Difficult",prompt:"Divide: 0.312 ÷ 0.001",options:["312","31.2","0.000312","3.12"],answer:"312",explanation:"Dividing by 0.001 moves the decimal point 3 places to the right: 0.312 → 312."},
  {id:33,topic:"Decimals",level:"Difficult",prompt:"Multiply: 0.36 × 0.05",options:["0.018","0.18","1.8","0.0018"],answer:"0.018",explanation:"36 × 5 = 180. There are 2 + 2 = 4 decimal places: 0.0180 = 0.018."},
  {id:34,topic:"Decimals",level:"Difficult",prompt:"Divide and round to the nearest hundredth: 25 ÷ 1.5",options:["16.67","16.66","1.67","166.67"],answer:"16.67",explanation:"Move the points 1 place right: 250 ÷ 15 = 16.666… The thousandths digit is 6, so round up: 16.67."},
  {id:35,topic:"Decimals",level:"Difficult",prompt:"Mia bought a notebook for ₱35.75 and a pen for ₱12.50. She paid with ₱100. How much change did she get?",options:["₱51.75","₱48.25","₱52.25","₱61.75"],answer:"₱51.75",explanation:"Total cost: 35.75 + 12.50 = ₱48.25. Change: 100.00 − 48.25 = ₱51.75."},
  {id:36,topic:"Decimals",level:"Difficult",prompt:"One kilo of rice costs ₱52.40. How much do 2.5 kilos cost?",options:["₱131.00","₱104.80","₱13.10","₱126.00"],answer:"₱131.00",explanation:"52.40 × 2.5: 5240 × 25 = 131000, with 3 decimal places → 131.000 = ₱131.00."},
  {id:37,topic:"Geometry",level:"Easy",prompt:"A prism whose two bases are triangles is called a ___.",options:["Triangular prism","Triangular pyramid","Rectangular prism","Cone"],answer:"Triangular prism",explanation:"A prism is named after the shape of its bases. Triangle bases make a triangular prism."},
  {id:38,topic:"Geometry",level:"Easy",prompt:"How many faces does a cube have?",options:["6","4","8","12"],answer:"6",explanation:"A cube has 6 equal square faces."},
  {id:39,topic:"Geometry",level:"Easy",prompt:"The lateral faces of a pyramid are always ___.",options:["Triangles","Rectangles","Circles","Squares"],answer:"Triangles",explanation:"Whatever the base, every lateral face of a pyramid is a triangle, and they meet at the apex."},
  {id:40,topic:"Geometry",level:"Easy",prompt:"Which of these is a plane (flat) figure, not a solid figure?",options:["Circle","Sphere","Cylinder","Cone"],answer:"Circle",explanation:"Plane figures are flat: circle, square, triangle. Solid figures are three-dimensional: sphere, cylinder, cone."},
  {id:41,topic:"Geometry",level:"Easy",prompt:"A can of sardines is shaped like a ___.",options:["Cylinder","Cone","Sphere","Pyramid"],answer:"Cylinder",explanation:"A cylinder has two parallel, equal circular bases, just like a can."},
  {id:42,topic:"Geometry",level:"Easy",prompt:"A sphere has a radius of 7 cm. How far is its center from any point on the sphere?",options:["7 cm","14 cm","3.5 cm","21 cm"],answer:"7 cm",explanation:"Every point of a sphere is the same distance from the center. That distance is the radius: 7 cm."},
  {id:43,topic:"Geometry",level:"Average",prompt:"Find the surface area of a cube with side 4 cm. (SA = 6s²)",options:["96 cm²","64 cm²","24 cm²","16 cm²"],answer:"96 cm²",explanation:"SA = 6 × 4 × 4 = 6 × 16 = 96 cm²."},
  {id:44,topic:"Geometry",level:"Average",prompt:"Find the surface area of a rectangular prism with l = 5 cm, w = 3 cm and h = 2 cm. (SA = 2(lw + lh + wh))",options:["62 cm²","30 cm²","31 cm²","124 cm²"],answer:"62 cm²",explanation:"lw = 15, lh = 10, wh = 6. SA = 2(15 + 10 + 6) = 2 × 31 = 62 cm²."},
  {id:45,topic:"Geometry",level:"Average",prompt:"A figure is a rectangle 8 cm by 5 cm with a triangle on top (base 8 cm, height 3 cm). What is its total area?",options:["52 cm²","64 cm²","43 cm²","40 cm²"],answer:"52 cm²",explanation:"Split the figure. Rectangle: 8 × 5 = 40 cm². Triangle: ½ × 8 × 3 = 12 cm². Total: 40 + 12 = 52 cm²."},
  {id:46,topic:"Geometry",level:"Average",prompt:"A square garden is 10 m on each side. A square pool 4 m on each side is inside it. What is the area of the garden without the pool?",options:["84 m²","96 m²","116 m²","60 m²"],answer:"84 m²",explanation:"Subtract the hole: 10 × 10 − 4 × 4 = 100 − 16 = 84 m²."},
  {id:47,topic:"Geometry",level:"Average",prompt:"A stage is a rectangle 10 m by 4 m with a semicircle of radius 2 m on one end. What is its total area? (Use π = 3.14)",options:["46.28 m²","52.56 m²","42 m²","43.14 m²"],answer:"46.28 m²",explanation:"Rectangle: 10 × 4 = 40 m². Semicircle: ½ × 3.14 × 2 × 2 = 6.28 m². Total: 46.28 m²."},
  {id:48,topic:"Geometry",level:"Average",prompt:"Which formula gives the surface area of a cube?",options:["6s²","s³","4s","s² + 2bh"],answer:"6s²",explanation:"A cube has 6 square faces, each with area s × s, so SA = 6s²."},
  {id:49,topic:"Geometry",level:"Difficult",prompt:"Find the surface area of a cylinder with r = 2 cm and h = 5 cm. (SA = 2πr² + 2πrh, π = 3.14)",options:["87.92 cm²","62.8 cm²","75.36 cm²","43.96 cm²"],answer:"87.92 cm²",explanation:"Two bases: 2 × 3.14 × 2 × 2 = 25.12. Side: 2 × 3.14 × 2 × 5 = 62.8. Total: 25.12 + 62.8 = 87.92 cm²."},
  {id:50,topic:"Geometry",level:"Difficult",prompt:"Find the surface area of a sphere with r = 5 cm. (SA = 4πr², π = 3.14)",options:["314 cm²","78.5 cm²","62.8 cm²","1256 cm²"],answer:"314 cm²",explanation:"SA = 4 × 3.14 × 5 × 5 = 12.56 × 25 = 314 cm²."},
  {id:51,topic:"Geometry",level:"Difficult",prompt:"Find the surface area of a cone with r = 3 cm and slant height s = 6 cm. (SA = πrs + πr², π = 3.14)",options:["84.78 cm²","56.52 cm²","113.04 cm²","28.26 cm²"],answer:"84.78 cm²",explanation:"Curved surface: 3.14 × 3 × 6 = 56.52. Base: 3.14 × 3 × 3 = 28.26. Total: 84.78 cm²."},
  {id:52,topic:"Geometry",level:"Difficult",prompt:"Find the surface area of a square pyramid with base edge b = 6 cm and slant height h = 5 cm. (SA = b² + 2bh)",options:["96 cm²","66 cm²","180 cm²","156 cm²"],answer:"96 cm²",explanation:"Base: 6 × 6 = 36. Four triangles: 2 × 6 × 5 = 60. Total: 36 + 60 = 96 cm²."},
  {id:53,topic:"Geometry",level:"Difficult",prompt:"A triangular prism has a triangle with base b = 6 cm and height h = 4 cm, slant sides s = 5 cm, and length l = 10 cm. Find its surface area. (SA = bh + 2ls + lb)",options:["184 cm²","160 cm²","124 cm²","240 cm²"],answer:"184 cm²",explanation:"bh = 6 × 4 = 24 (both triangles). 2ls = 2 × 10 × 5 = 100. lb = 10 × 6 = 60. Total: 24 + 100 + 60 = 184 cm²."},
  {id:54,topic:"Geometry",level:"Difficult",prompt:"A gift box is 20 cm long, 10 cm wide and 5 cm high. How much wrapping paper covers it exactly?",options:["700 cm²","1000 cm²","350 cm²","35 cm²"],answer:"700 cm²",explanation:"Find the surface area: 2(20 × 10 + 20 × 5 + 10 × 5) = 2(200 + 100 + 50) = 700 cm²."},
  {id:55,topic:"Speed",level:"Easy",prompt:"Is 60 km/h a speed, a distance, or a time?",options:["Speed","Distance","Time","Area"],answer:"Speed",explanation:"Units like km/h, m/s and mph measure speed: distance traveled per unit of time."},
  {id:56,topic:"Speed",level:"Easy",prompt:"Is 45 minutes a speed, a distance, or a time?",options:["Time","Speed","Distance","Area"],answer:"Time",explanation:"Seconds, minutes and hours measure time."},
  {id:57,topic:"Speed",level:"Easy",prompt:"Is 12 km a speed, a distance, or a time?",options:["Distance","Speed","Time","Area"],answer:"Distance",explanation:"Meters and kilometers measure distance."},
  {id:58,topic:"Speed",level:"Easy",prompt:"Which formula finds speed?",options:["S = D ÷ T","S = D × T","S = T ÷ D","S = D + T"],answer:"S = D ÷ T",explanation:"Speed = distance ÷ time. In the D-S-T triangle, D sits on top of S and T."},
  {id:59,topic:"Speed",level:"Easy",prompt:"Which formula finds distance?",options:["D = S × T","D = S ÷ T","D = T ÷ S","D = S + T"],answer:"D = S × T",explanation:"Distance = speed × time. In the D-S-T triangle, S and T sit side by side, so multiply."},
  {id:60,topic:"Speed",level:"Easy",prompt:"A car travels 100 km in 2 hours. What is its speed?",options:["50 km/h","200 km/h","102 km/h","98 km/h"],answer:"50 km/h",explanation:"S = D ÷ T = 100 ÷ 2 = 50 km/h."},
  {id:61,topic:"Speed",level:"Average",prompt:"A bus travels at 60 km/h for 3 hours. How far does it go?",options:["180 km","20 km","63 km","57 km"],answer:"180 km",explanation:"D = S × T = 60 × 3 = 180 km."},
  {id:62,topic:"Speed",level:"Average",prompt:"A cyclist rides 36 km at 12 km/h. How long does the ride take?",options:["3 hours","4 hours","24 hours","48 hours"],answer:"3 hours",explanation:"T = D ÷ S = 36 ÷ 12 = 3 hours."},
  {id:63,topic:"Speed",level:"Average",prompt:"A runner covers 400 m in 50 seconds. What is the average speed?",options:["8 m/s","80 m/s","0.8 m/s","0.125 m/s"],answer:"8 m/s",explanation:"S = D ÷ T = 400 ÷ 50 = 8 m/s."},
  {id:64,topic:"Speed",level:"Average",prompt:"A jeepney travels at 30 km/h for 1.5 hours. How far does it travel?",options:["45 km","20 km","31.5 km","4.5 km"],answer:"45 km",explanation:"D = S × T = 30 × 1.5 = 45 km."},
  {id:65,topic:"Speed",level:"Average",prompt:"A tricycle goes 8 km at 16 km/h. How many minutes does the trip take?",options:["30 minutes","2 minutes","50 minutes","20 minutes"],answer:"30 minutes",explanation:"T = D ÷ S = 8 ÷ 16 = 0.5 hour. 0.5 × 60 = 30 minutes."},
  {id:66,topic:"Speed",level:"Average",prompt:"A train covers 240 km in 3 hours at 80 km/h. Which value is the distance?",options:["240 km","3 hours","80 km/h","720 km"],answer:"240 km",explanation:"Distance uses length units such as m or km, so the distance is 240 km."},
  {id:67,topic:"Speed",level:"Difficult",prompt:"A ferry leaves at 9:30 AM and travels 20 km at 40 km/h. What time does it arrive?",options:["10:00 AM","10:30 AM","9:50 AM","11:30 AM"],answer:"10:00 AM",explanation:"T = 20 ÷ 40 = 0.5 hour = 30 minutes. 9:30 AM + 30 minutes = 10:00 AM."},
  {id:68,topic:"Speed",level:"Difficult",prompt:"A truck left at 7:00 AM and arrived at 11:00 AM after traveling 220 km. What was its average speed?",options:["55 km/h","44 km/h","73.3 km/h","880 km/h"],answer:"55 km/h",explanation:"7:00 AM to 11:00 AM is 4 hours. S = 220 ÷ 4 = 55 km/h."},
  {id:69,topic:"Speed",level:"Difficult",prompt:"Anna walks 2.4 km to school at 4 km/h. How many minutes does it take?",options:["36 minutes","60 minutes","9.6 minutes","24 minutes"],answer:"36 minutes",explanation:"T = 2.4 ÷ 4 = 0.6 hour. 0.6 × 60 = 36 minutes."},
  {id:70,topic:"Speed",level:"Difficult",prompt:"A car travels 90 km at 60 km/h, then 40 km at 40 km/h. How long is the whole trip?",options:["2.5 hours","2 hours","3.25 hours","1.3 hours"],answer:"2.5 hours",explanation:"Part 1: 90 ÷ 60 = 1.5 hours. Part 2: 40 ÷ 40 = 1 hour. Total: 1.5 + 1 = 2.5 hours."},
  {id:71,topic:"Speed",level:"Difficult",prompt:"A van travels 120 km in 2.5 hours. What is its average speed?",options:["48 km/h","300 km/h","50 km/h","60 km/h"],answer:"48 km/h",explanation:"S = D ÷ T = 120 ÷ 2.5 = 48 km/h."},
  {id:72,topic:"Speed",level:"Difficult",prompt:"A boat goes 15 km in 45 minutes. What is its speed in km/h?",options:["20 km/h","0.33 km/h","11.25 km/h","3 km/h"],answer:"20 km/h",explanation:"45 minutes = 0.75 hour. S = 15 ÷ 0.75 = 20 km/h."},
  {id:73,topic:"Outcomes",level:"Easy",prompt:"A coin is tossed once. How many possible outcomes are there?",options:["2","1","4","6"],answer:"2",explanation:"The outcomes are Heads (H) and Tails (T): 2 outcomes."},
  {id:74,topic:"Outcomes",level:"Easy",prompt:"A standard die is rolled once. How many possible outcomes are there?",options:["6","1","12","36"],answer:"6",explanation:"The die can land on 1, 2, 3, 4, 5 or 6: 6 outcomes."},
  {id:75,topic:"Outcomes",level:"Easy",prompt:"Which list shows ALL outcomes of tossing two coins?",options:["HH, HT, TH, TT","HH, TT","HT, TH","HH, HT, TT"],answer:"HH, HT, TH, TT",explanation:"Pair each result of the first coin with each result of the second: HH, HT, TH, TT."},
  {id:76,topic:"Outcomes",level:"Easy",prompt:"Rica has 2 skirts and 3 blouses. How many skirt-and-blouse outfits can she make?",options:["6","5","3","9"],answer:"6",explanation:"Each of the 2 skirts can go with each of the 3 blouses: 2 × 3 = 6 outfits."},
  {id:77,topic:"Outcomes",level:"Easy",prompt:"A spinner has 4 colors: red, blue, green and yellow. How many outcomes are there for one spin?",options:["4","1","2","8"],answer:"4",explanation:"The spinner can land on any of the 4 colors: 4 outcomes."},
  {id:78,topic:"Outcomes",level:"Easy",prompt:"A lunch has 1 rice (plain or fried) and 1 viand (adobo or sinigang). Which is NOT a possible outcome?",options:["Fried rice; tinola","Plain rice; adobo","Fried rice; sinigang","Plain rice; sinigang"],answer:"Fried rice; tinola",explanation:"Tinola is not one of the viand choices, so it cannot be part of an outcome."},
  {id:79,topic:"Outcomes",level:"Average",prompt:"A coin is tossed and a die is rolled. How many outcomes are there?",options:["12","8","6","36"],answer:"12",explanation:"Each of the 2 coin results pairs with each of the 6 die results: 2 × 6 = 12."},
  {id:80,topic:"Outcomes",level:"Average",prompt:"A locker code uses 1 letter (A, B or C) then 1 digit (1 or 2). How many codes can be made?",options:["6","5","3","9"],answer:"6",explanation:"List them: A1, A2, B1, B2, C1, C2. That is 3 × 2 = 6 codes."},
  {id:81,topic:"Outcomes",level:"Average",prompt:"Two dice are rolled. How many outcomes show two odd numbers?",options:["9","3","6","36"],answer:"9",explanation:"Each die has 3 odd numbers (1, 3, 5). Pairs: 3 × 3 = 9."},
  {id:82,topic:"Outcomes",level:"Average",prompt:"A tree diagram has 3 branches for the first choice, and each of those splits into 4 branches. How many outcomes are at the ends?",options:["12","7","4","3"],answer:"12",explanation:"Each of the 3 first branches ends in 4 outcomes: 3 × 4 = 12."},
  {id:83,topic:"Outcomes",level:"Average",prompt:"A class elects 1 president (Ana or Ben) and 1 secretary (Cy, Dan or Eva). Which outcome is possible?",options:["Ben, Eva","Ana, Ben","Cy, Dan","Eva, Eva"],answer:"Ben, Eva",explanation:"An outcome pairs one president candidate with one secretary candidate: Ben (president) and Eva (secretary)."},
  {id:84,topic:"Outcomes",level:"Average",prompt:"A bag has 1 red, 1 white and 1 blue marble. Two marbles are drawn at the same time. How many different pairs are possible?",options:["3","6","9","2"],answer:"3",explanation:"Drawn together, the order does not matter: red-white, red-blue, white-blue. That is 3 pairs."},
  {id:85,topic:"Outcomes",level:"Difficult",prompt:"A coin is tossed 3 times. How many outcomes are in the sample space?",options:["8","6","9","3"],answer:"8",explanation:"2 × 2 × 2 = 8: HHH, HHT, HTH, HTT, THH, THT, TTH, TTT."},
  {id:86,topic:"Outcomes",level:"Difficult",prompt:"Ice cream comes in a cup or a cone, in 3 flavors, with 2 toppings. How many combinations of one of each are there?",options:["12","7","6","18"],answer:"12",explanation:"Multiply the choices: 2 × 3 × 2 = 12 combinations."},
  {id:87,topic:"Outcomes",level:"Difficult",prompt:"A coin is tossed 3 times. How many outcomes have exactly 2 heads?",options:["3","2","4","6"],answer:"3",explanation:"From the 8 outcomes, the ones with exactly 2 heads are HHT, HTH and THH: 3 outcomes."},
  {id:88,topic:"Outcomes",level:"Difficult",prompt:"Two dice are rolled. In how many outcomes is the sum 7?",options:["6","7","5","12"],answer:"6",explanation:"(1,6), (2,5), (3,4), (4,3), (5,2), (6,1): 6 outcomes."},
  {id:89,topic:"Outcomes",level:"Difficult",prompt:"A snack stand has 4 drinks. There are 20 possible drink-and-snack combinations. How many snacks does it sell?",options:["5","16","24","80"],answer:"5",explanation:"Drinks × snacks = 20, so snacks = 20 ÷ 4 = 5."},
  {id:90,topic:"Outcomes",level:"Difficult",prompt:"A password is 1 letter (A or B), then 1 digit (0–9), then 1 symbol (# or @). How many passwords are possible?",options:["40","14","20","100"],answer:"40",explanation:"Multiply the choices at each step: 2 × 10 × 2 = 40."},
  {id:91,topic:"Integers",level:"Easy",prompt:"Add: (−6) + (−9)",options:["−15","15","−3","3"],answer:"−15",explanation:"Same signs: add 6 + 9 = 15 and keep the negative sign: −15."},
  {id:92,topic:"Integers",level:"Easy",prompt:"Add: 14 + (−5)",options:["9","−9","19","−19"],answer:"9",explanation:"Different signs: subtract 14 − 5 = 9 and copy the sign of the larger number (14, positive): 9."},
  {id:93,topic:"Integers",level:"Easy",prompt:"Add: (−12) + 7",options:["−5","5","−19","19"],answer:"−5",explanation:"Different signs: 12 − 7 = 5. The larger number, 12, is negative, so the answer is −5."},
  {id:94,topic:"Integers",level:"Easy",prompt:"Add: (−8) + 8",options:["0","−16","16","−8"],answer:"0",explanation:"A number plus its opposite is zero. Zero has no sign."},
  {id:95,topic:"Integers",level:"Easy",prompt:"Add: (−23) + (−17)",options:["−40","40","−6","6"],answer:"−40",explanation:"Same signs: 23 + 17 = 40, keep the negative sign: −40."},
  {id:96,topic:"Integers",level:"Easy",prompt:"Add: 35 + (−50)",options:["−15","15","−85","85"],answer:"−15",explanation:"Different signs: 50 − 35 = 15. The larger number, 50, is negative, so −15."},
  {id:97,topic:"Integers",level:"Average",prompt:"Subtract: 9 − 15",options:["−6","6","24","−24"],answer:"−6",explanation:"Add the opposite of the subtrahend: 9 + (−15). Different signs: 15 − 9 = 6, sign of 15 (−): −6."},
  {id:98,topic:"Integers",level:"Average",prompt:"Subtract: (−7) − (−10)",options:["3","−3","−17","17"],answer:"3",explanation:"Add the opposite of −10: (−7) + 10. Different signs: 10 − 7 = 3, sign of 10 (+): 3."},
  {id:99,topic:"Integers",level:"Average",prompt:"Subtract: 12 − (−8)",options:["20","4","−4","−20"],answer:"20",explanation:"Subtracting a negative becomes adding a positive: 12 + 8 = 20."},
  {id:100,topic:"Integers",level:"Average",prompt:"Subtract: (−15) − 6",options:["−21","−9","9","21"],answer:"−21",explanation:"Add the opposite of 6: (−15) + (−6). Same signs: 15 + 6 = 21, keep −: −21."},
  {id:101,topic:"Integers",level:"Average",prompt:"Subtract: (−20) − (−4)",options:["−16","−24","16","24"],answer:"−16",explanation:"Add the opposite of −4: (−20) + 4. Different signs: 20 − 4 = 16, sign of 20 (−): −16."},
  {id:102,topic:"Integers",level:"Average",prompt:"Which addition is the same as 5 − (−3)?",options:["5 + 3","5 + (−3)","(−5) + 3","(−5) + (−3)"],answer:"5 + 3",explanation:"To subtract, add the opposite of the subtrahend. The opposite of −3 is 3, so 5 − (−3) = 5 + 3."},
  {id:103,topic:"Integers",level:"Difficult",prompt:"Multiply: (−7) × (−8)",options:["56","−56","15","−15"],answer:"56",explanation:"Same signs give a positive product: 7 × 8 = 56."},
  {id:104,topic:"Integers",level:"Difficult",prompt:"Multiply: 9 × (−6)",options:["−54","54","3","−15"],answer:"−54",explanation:"Different signs give a negative product: 9 × 6 = 54, so −54."},
  {id:105,topic:"Integers",level:"Difficult",prompt:"Divide: (−72) ÷ 8",options:["−9","9","−64","−80"],answer:"−9",explanation:"Different signs give a negative quotient: 72 ÷ 8 = 9, so −9."},
  {id:106,topic:"Integers",level:"Difficult",prompt:"Divide: (−96) ÷ (−12)",options:["8","−8","−84","108"],answer:"8",explanation:"Same signs give a positive quotient: 96 ÷ 12 = 8."},
  {id:107,topic:"Integers",level:"Difficult",prompt:"Multiply: (−2) × 5 × (−4)",options:["40","−40","−1","11"],answer:"40",explanation:"There are 2 negative factors (an even number), so the product is positive: 2 × 5 × 4 = 40."},
  {id:108,topic:"Integers",level:"Difficult",prompt:"Multiply: (−3/4) × (−2/5)",options:["3/10","−3/10","5/9","−5/9"],answer:"3/10",explanation:"Same signs give a positive product. 3 × 2 = 6 and 4 × 5 = 20: 6/20 = 3/10."}
];


// =====================================================================
// Accounts, roles and scoped data
//   admin   – manages every account and sees every class
//   teacher – manages own students and sees only their results
//   student – plays; saves own games and adventure progress
// =====================================================================
const TOPICS = ["Mixed","Fractions","Decimals","Geometry","Speed","Outcomes","Integers"];
const LEVELS = ["Easy","Average","Difficult","All levels"];
const GAME_TYPES = ["Practice","Pre-test","Post-test","Adventure"];
const ROLES = ["admin","teacher","student"];
const TOKEN_DAYS = 7;
const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;
// Grade 7 sections allowed in the Section drop-downs. Keep this list the same as SECTIONS in frontend/auth.js.
const SECTIONS = ["Narra", "Acacia", "Mahogany"];
function cleanSection(v) {
  const s = cleanText(v, 40);
  if (s && !SECTIONS.includes(s)) throw httpError(400, `Choose a section: ${SECTIONS.join(", ")}.`);
  return s;
}

function httpError(status, message) { const e = new Error(message); e.status = status; return e; }
const cleanText = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
const toId = v => { try { return new ObjectId(String(v)); } catch (e) { return null; } };
const sha256 = s => crypto.createHash("sha256").update(s).digest("hex");

// Passwords: salted scrypt hash, never stored in plain text.
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}
function checkPassword(password, stored) {
  if (typeof stored !== "string" || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const expected = Buffer.from(hash, "hex"), actual = crypto.scryptSync(String(password), salt, 64);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
function publicUser(u) {
  return u && {
    id: u._id.toString(), username: u.username, name: u.name, role: u.role,
    section: u.section || "", teacherId: u.teacherId ? u.teacherId.toString() : null,
    status: u.status || "active", classCode: u.role === "teacher" ? u.classCode || null : undefined,
    avatarAt: u.avatarAt || null, // when the profile picture last changed (null = no picture)
    createdAt: u.createdAt, lastLoginAt: u.lastLoginAt || null
  };
}
// Teachers get a short class code; students type it when they register to join that class.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I, so codes are easy to read aloud
async function newClassCode() {
  for (;;) {
    const code = Array.from(crypto.randomBytes(6), b => CODE_CHARS[b % CODE_CHARS.length]).join("");
    if (!(await users.findOne({ classCode: code }))) return code;
  }
}
// Simple per-IP limit for sign-ups and password-help requests.
const hits = new Map();
function rateLimited(key, max, windowMs) {
  const now = Date.now(), h = hits.get(key);
  if (!h || now - h.first > windowMs) { hits.set(key, { count: 1, first: now }); return false; }
  return ++h.count > max;
}
// When someone's password is set by a teacher or admin, their open password-help requests are done.
const resolveRequests = (userId, by) =>
  resetRequests.updateMany({ userId, status: "open" }, { $set: { status: "resolved", resolvedAt: new Date().toISOString(), resolvedBy: by } });
function publicRequest(r) {
  return { id: r._id.toString(), userId: r.userId.toString(), username: r.username, name: r.name, role: r.role, createdAt: r.createdAt };
}
const percentExpr = { $multiply: [100, { $divide: ["$score", { $multiply: ["$total_questions", 10] }] }] };

// Simple brute-force protection: 8 failed logins per username + IP locks for 15 minutes.
const failedLogins = new Map();
const LOCK_MS = 15 * 60 * 1000;
function isLocked(key) { const f = failedLogins.get(key); return !!f && f.count >= 8 && Date.now() - f.first < LOCK_MS; }
function noteFailure(key) {
  const f = failedLogins.get(key);
  if (!f || Date.now() - f.first > LOCK_MS) failedLogins.set(key, { count: 1, first: Date.now() }); else f.count++;
}

// --- Middleware ---
async function auth(req, res, next) {
  try {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Please log in." });
    const login = await logins.findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } });
    if (!login) return res.status(401).json({ error: "Your session has ended. Please log in again." });
    const user = await users.findOne({ _id: login.userId });
    if (!user) return res.status(401).json({ error: "This account no longer exists." });
    req.user = user; req.tokenHash = login.tokenHash;
    next();
  } catch (error) { next(error); }
}
const allow = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: "Your account is not allowed to do this." });
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// --- Shared helpers ---
async function createUser({ username, name, role, password, section, teacherId, status }) {
  username = cleanText(username, 30).toLowerCase(); name = cleanText(name, 60); section = cleanSection(section);
  if (!ROLES.includes(role)) throw httpError(400, "Choose a role: admin, teacher or student.");
  if (!name) throw httpError(400, "Please enter the person's name.");
  if (!USERNAME_RE.test(username)) throw httpError(400, "Username must be 3–30 characters: letters, numbers, dots, dashes or underscores.");
  if (typeof password !== "string" || password.length < 6) throw httpError(400, "Password needs at least 6 characters.");
  let tId = null;
  if (role === "student" && teacherId) {
    tId = toId(teacherId);
    if (!tId || !(await users.findOne({ _id: tId, role: "teacher" }))) throw httpError(400, "That teacher was not found.");
  }
  if (await users.findOne({ username })) throw httpError(409, "That username is already taken.");
  const doc = { username, name, role, section, teacherId: tId, status: status === "pending" ? "pending" : "active",
    passwordHash: hashPassword(password), createdAt: new Date().toISOString(), lastLoginAt: null };
  if (role === "teacher") doc.classCode = await newClassCode();
  doc._id = (await users.insertOne(doc)).insertedId;
  return doc;
}

// Adds game stats, latest pre/post-test % and adventure progress to a list of students.
async function withStudentStats(list) {
  const ids = list.map(s => s._id);
  if (!ids.length) return [];
  const [games, tests, prog] = await Promise.all([
    sessions.aggregate([
      { $match: { userId: { $in: ids } } },
      { $group: { _id: "$userId", games: { $sum: 1 }, avg: { $avg: percentExpr }, last: { $max: "$created_at" } } }
    ]).toArray(),
    sessions.aggregate([
      { $match: { userId: { $in: ids }, type: { $in: ["Pre-test", "Post-test"] } } },
      { $sort: { created_at: 1 } },
      { $group: { _id: { u: "$userId", t: "$type" }, pct: { $last: percentExpr } } }
    ]).toArray(),
    progress.find({ userId: { $in: ids } }).toArray()
  ]);
  const key = id => id.toString();
  const g = new Map(games.map(r => [key(r._id), r]));
  const p = new Map(prog.map(r => [key(r.userId), r]));
  const t = new Map(tests.map(r => [key(r._id.u) + r._id.t, r.pct]));
  return list.map(s => {
    const k = key(s._id), gr = g.get(k), pr = p.get(k);
    return {
      ...publicUser(s),
      games: gr ? gr.games : 0,
      averagePercent: gr ? Math.round(gr.avg * 10) / 10 : null,
      lastPlayed: gr ? gr.last : null,
      prePercent: t.has(k + "Pre-test") ? Math.round(t.get(k + "Pre-test")) : null,
      postPercent: t.has(k + "Post-test") ? Math.round(t.get(k + "Post-test")) : null,
      xp: pr ? pr.xp : 0,
      stars: pr ? Object.values(pr.stars || {}).reduce((a, b) => a + b, 0) : 0,
      trailBest: pr ? pr.trailBest || {} : {}
    };
  });
}
// Which game sessions each role may see.
function sessionScope(req) {
  const { role, _id } = req.user;
  if (role === "student") return { userId: _id };
  const filter = role === "teacher" ? { teacherId: _id } : {};
  const studentId = req.query.studentId && toId(req.query.studentId);
  if (studentId) filter.userId = studentId;
  return filter;
}
async function summaryFor(filter) {
  const [s] = await sessions.aggregate([
    { $match: filter },
    { $group: { _id: null, sessions: { $sum: 1 }, points: { $sum: "$score" }, average_percent: { $avg: percentExpr } } },
    { $project: { _id: 0, sessions: 1, points: 1, average_percent: { $round: ["$average_percent", 1] } } }
  ]).toArray();
  return s || { sessions: 0, points: 0, average_percent: 0 };
}
function cleanProgress(b) {
  const out = { xp: 0, stars: {}, trailBest: {} };
  if (!b || typeof b !== "object") return out;
  if (Number.isInteger(b.xp) && b.xp >= 0) out.xp = Math.min(b.xp, 1e7);
  if (b.stars && typeof b.stars === "object")
    for (const [k, v] of Object.entries(b.stars)) if (/^[A-Za-z]{3,20}-[0-2]$/.test(k) && Number.isInteger(v) && v >= 0 && v <= 3) out.stars[k] = v;
  if (b.trailBest && typeof b.trailBest === "object")
    for (const m of ["Easy", "Average", "Difficult"]) if (Number.isInteger(b.trailBest[m]) && b.trailBest[m] >= 0) out.trailBest[m] = Math.min(b.trailBest[m], 1e7);
  return out;
}
// Progress only ever goes up, so playing on two devices never loses stars.
function mergeProgress(a, b) {
  const out = { xp: Math.max(a.xp || 0, b.xp || 0), stars: { ...(a.stars || {}) }, trailBest: { ...(a.trailBest || {}) } };
  for (const [k, v] of Object.entries(b.stars || {})) out.stars[k] = Math.max(out.stars[k] || 0, v);
  for (const [k, v] of Object.entries(b.trailBest || {})) out.trailBest[k] = Math.max(out.trailBest[k] || 0, v);
  return out;
}

// --- Public ---
app.get("/api/health", (req, res) => res.json({ status: "ok", app: "Mathinik Quest" }));
app.get("/api/questions", (req, res) => {
  const { topic = "Mixed", level = "All levels" } = req.query;
  res.json(questions.filter(q => (topic === "Mixed" || q.topic === topic) && (level === "All levels" || q.level === level)));
});

// --- Login (everyone) ---
app.post("/api/auth/login", wrap(async (req, res) => {
  const body = req.body || {};
  const username = cleanText(body.username, 30).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const key = username + "|" + req.ip;
  if (isLocked(key)) return res.status(429).json({ error: "Too many wrong tries. Wait 15 minutes and try again." });
  const user = username ? await users.findOne({ username }) : null;
  if (!user || !checkPassword(password, user.passwordHash)) {
    noteFailure(key);
    return res.status(401).json({ error: "Wrong username or password." });
  }
  if (ROLES.includes(body.role) && body.role !== user.role) {
    const label = user.role[0].toUpperCase() + user.role.slice(1);
    return res.status(403).json({ error: `This is ${user.role === "admin" ? "an" : "a"} ${user.role} account. Choose the ${label} tab to log in.` });
  }
  if (user.status === "pending") return res.status(403).json({ error: "Your teacher account is waiting for an admin to approve it. Please try again later." });
  failedLogins.delete(key);
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  await logins.insertOne({ tokenHash: sha256(token), userId: user._id, createdAt: now, expiresAt: new Date(now.getTime() + TOKEN_DAYS * 864e5) });
  user.lastLoginAt = now.toISOString();
  await users.updateOne({ _id: user._id }, { $set: { lastLoginAt: user.lastLoginAt } });
  res.json({ token, user: publicUser(user) });
}));
// Self sign-up. Students join a class with their teacher's class code and can log in right away.
// Teachers start as "pending" until an admin approves them. Admins cannot sign themselves up.
app.post("/api/auth/register", wrap(async (req, res) => {
  if (rateLimited("reg|" + req.ip, 10, 60 * 60 * 1000)) return res.status(429).json({ error: "Too many sign-ups from this device. Try again in an hour." });
  const b = req.body || {};
  if (b.role !== "student" && b.role !== "teacher") throw httpError(400, "Admin accounts can only be created by an admin.");
  if (b.password !== b.confirm) throw httpError(400, "The two passwords do not match.");
  if (b.role === "student") {
    const code = cleanText(b.classCode, 12).toUpperCase().replace(/\s/g, "");
    let teacher = null;
    if (code) {
      teacher = await users.findOne({ role: "teacher", classCode: code, status: { $ne: "pending" } });
      if (!teacher) throw httpError(400, "That class code was not found. Check it with your teacher.");
    }
    const user = await createUser({ username: b.username, name: b.name, password: b.password, section: b.section, role: "student", teacherId: teacher ? teacher._id : null });
    const token = crypto.randomBytes(32).toString("hex"), now = new Date();
    await logins.insertOne({ tokenHash: sha256(token), userId: user._id, createdAt: now, expiresAt: new Date(now.getTime() + TOKEN_DAYS * 864e5) });
    user.lastLoginAt = now.toISOString();
    await users.updateOne({ _id: user._id }, { $set: { lastLoginAt: user.lastLoginAt } });
    return res.status(201).json({ token, user: publicUser(user), teacherName: teacher ? teacher.name : null });
  }
  await createUser({ username: b.username, name: b.name, password: b.password, section: b.section, role: "teacher", status: "pending" });
  res.status(201).json({ pending: true, message: "Account created. An admin needs to approve it before you can log in." });
}));
// Forgot password: no email, so the request goes to someone who can set a new password —
// the student's teacher, or an admin for everyone else. The reply is the same whether or not
// the account exists, so this cannot be used to find out which usernames exist.
app.post("/api/auth/forgot", wrap(async (req, res) => {
  if (rateLimited("forgot|" + req.ip, 10, 60 * 60 * 1000)) return res.status(429).json({ error: "Too many requests from this device. Try again in an hour." });
  const b = req.body || {};
  const username = cleanText(b.username, 30).toLowerCase();
  const user = username ? await users.findOne({ username }) : null;
  if (user && (!ROLES.includes(b.role) || b.role === user.role) && user.status !== "pending") {
    await resetRequests.updateOne(
      { userId: user._id, status: "open" },
      { $set: { username: user.username, name: user.name, role: user.role, teacherId: user.teacherId || null, createdAt: new Date().toISOString() },
        $setOnInsert: { userId: user._id, status: "open" } },
      { upsert: true });
  }
  const who = b.role === "student" ? "your teacher (or the admin)" : "the admin";
  res.json({ ok: true, message: `If that account exists, ${who} can now see your request and will give you a new password.` });
}));
app.post("/api/auth/logout", auth, wrap(async (req, res) => {
  await logins.deleteOne({ tokenHash: req.tokenHash });
  res.json({ ok: true });
}));
app.get("/api/auth/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));
// Edit profile: anyone can change their own display name. Section, username, role and teacher
// cannot be changed here — a student's section is set by their teacher (or an admin).
app.patch("/api/me", auth, wrap(async (req, res) => {
  const b = req.body || {}, set = {};
  if (b.name !== undefined) { set.name = cleanText(b.name, 60); if (!set.name) throw httpError(400, "Please enter your name."); }
  if (Object.keys(set).length) await users.updateOne({ _id: req.user._id }, { $set: set });
  res.json({ user: publicUser({ ...req.user, ...set }) });
}));
app.post("/api/auth/password", auth, wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!checkPassword(currentPassword || "", req.user.passwordHash)) throw httpError(400, "Your current password is not correct.");
  if (typeof newPassword !== "string" || newPassword.length < 6) throw httpError(400, "The new password needs at least 6 characters.");
  await users.updateOne({ _id: req.user._id }, { $set: { passwordHash: hashPassword(newPassword) } });
  await logins.deleteMany({ userId: req.user._id, tokenHash: { $ne: req.tokenHash } }); // log out other devices
  res.json({ ok: true });
}));

// --- Games (all roles, scoped) ---
app.post("/api/sessions", auth, allow("student"), wrap(async (req, res) => {
  const { playerName, mode, topic, difficulty, score, totalQuestions } = req.body || {};
  const type = (req.body || {}).type || "Practice";
  if (!playerName || !["Individual", "Team"].includes(mode) || !TOPICS.includes(topic) || !LEVELS.includes(difficulty) ||
      !GAME_TYPES.includes(type) || !Number.isInteger(score) || score < 0 ||
      !Number.isInteger(totalQuestions) || totalQuestions < 1 || score > totalQuestions * 10) {
    throw httpError(400, "Please provide valid session details.");
  }
  const result = await sessions.insertOne({
    player_name: String(playerName).trim().slice(0, 60), mode, topic, difficulty, type, score,
    total_questions: totalQuestions, created_at: new Date().toISOString(),
    userId: req.user._id, username: req.user.username, teacherId: req.user.teacherId || null
  });
  res.status(201).json({ id: result.insertedId.toString(), message: "Score saved." });
}));
app.get("/api/sessions", auth, wrap(async (req, res) => {
  const rows = await sessions.find(sessionScope(req)).sort({ created_at: -1, _id: -1 }).limit(200).toArray();
  res.json(rows.map(({ _id, userId, teacherId, ...row }) => ({ ...row, id: _id.toString(), userId: userId ? userId.toString() : null })));
}));
app.get("/api/summary", auth, wrap(async (req, res) => res.json(await summaryFor(sessionScope(req)))));

// --- Student: own adventure progress ---
app.get("/api/me/progress", auth, allow("student"), wrap(async (req, res) => {
  const doc = await progress.findOne({ userId: req.user._id });
  res.json(cleanProgress(doc || {}));
}));
app.put("/api/me/progress", auth, allow("student"), wrap(async (req, res) => {
  const current = cleanProgress((await progress.findOne({ userId: req.user._id })) || {});
  const merged = mergeProgress(current, cleanProgress(req.body));
  await progress.updateOne({ userId: req.user._id }, { $set: { ...merged, updatedAt: new Date().toISOString() } }, { upsert: true });
  res.json(merged);
}));

// --- Teacher: own class ---
app.get("/api/teacher/students", auth, allow("teacher"), wrap(async (req, res) => {
  const list = await users.find({ role: "student", teacherId: req.user._id }).sort({ name: 1 }).toArray();
  res.json(await withStudentStats(list));
}));
app.post("/api/teacher/students", auth, allow("teacher"), wrap(async (req, res) => {
  const b = req.body || {};
  const doc = await createUser({ username: b.username, name: b.name, password: b.password, section: b.section, role: "student", teacherId: req.user._id });
  res.status(201).json(publicUser(doc));
}));
app.patch("/api/teacher/students/:id", auth, allow("teacher"), wrap(async (req, res) => {
  const id = toId(req.params.id);
  const student = id && await users.findOne({ _id: id, role: "student", teacherId: req.user._id });
  if (!student) throw httpError(404, "That student is not in your class.");
  const b = req.body || {}, set = {};
  if (b.name !== undefined) { set.name = cleanText(b.name, 60); if (!set.name) throw httpError(400, "Name cannot be empty."); }
  if (b.section !== undefined) set.section = cleanSection(b.section);
  if (b.password !== undefined) {
    if (typeof b.password !== "string" || b.password.length < 6) throw httpError(400, "Password needs at least 6 characters.");
    set.passwordHash = hashPassword(b.password);
  }
  await users.updateOne({ _id: id }, { $set: set });
  if (set.passwordHash) { await logins.deleteMany({ userId: id }); await resolveRequests(id, req.user._id); }
  res.json(publicUser({ ...student, ...set }));
}));
app.get("/api/teacher/requests", auth, allow("teacher"), wrap(async (req, res) => {
  const list = await resetRequests.find({ status: "open", role: "student", teacherId: req.user._id }).sort({ createdAt: -1 }).toArray();
  res.json(list.map(publicRequest));
}));
app.post("/api/teacher/requests/:id/dismiss", auth, allow("teacher"), wrap(async (req, res) => {
  const id = toId(req.params.id);
  const r = id && await resetRequests.updateOne({ _id: id, status: "open", teacherId: req.user._id }, { $set: { status: "dismissed", resolvedAt: new Date().toISOString(), resolvedBy: req.user._id } });
  if (!r || !r.matchedCount) throw httpError(404, "That request was not found.");
  res.json({ ok: true });
}));
// --- Profile pictures ---
// Stored in their own collection, never as public links: a student's picture can be seen only by the
// student, their teacher and admins; a teacher's by the teacher and admins.
const AVATAR_MAX_BYTES = 300 * 1024;
function parseAvatar(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(typeof dataUrl === "string" ? dataUrl : "");
  if (!m) throw httpError(400, "Please choose a JPG, PNG or WebP picture.");
  const data = Buffer.from(m[2], "base64");
  if (!data.length) throw httpError(400, "That picture is empty.");
  if (data.length > AVATAR_MAX_BYTES) throw httpError(413, "That picture is too big. Please choose a smaller one.");
  const isJpeg = data[0] === 0xff && data[1] === 0xd8, isPng = data.slice(0, 4).toString("hex") === "89504e47",
        isWebp = data.slice(0, 4).toString() === "RIFF" && data.slice(8, 12).toString() === "WEBP";
  if (!isJpeg && !isPng && !isWebp) throw httpError(400, "That file is not a picture.");
  return { mime: m[1], data };
}
const avatarUrl = d => `data:${d.mime};base64,${Buffer.from(d.data.buffer || d.data).toString("base64")}`;
async function canSeeAvatarOf(viewer, target) {
  if (viewer.role === "admin" || viewer._id.equals(target._id)) return true;
  return viewer.role === "teacher" && target.role === "student" && !!target.teacherId && target.teacherId.equals(viewer._id);
}
app.put("/api/me/avatar", auth, wrap(async (req, res) => {
  const { mime, data } = parseAvatar((req.body || {}).image);
  const avatarAt = new Date().toISOString();
  await avatars.updateOne({ userId: req.user._id }, { $set: { mime, data, updatedAt: avatarAt } }, { upsert: true });
  await users.updateOne({ _id: req.user._id }, { $set: { avatarAt } });
  res.json({ avatarAt, image: avatarUrl({ mime, data }) });
}));
app.delete("/api/me/avatar", auth, wrap(async (req, res) => {
  await avatars.deleteOne({ userId: req.user._id });
  await users.updateOne({ _id: req.user._id }, { $unset: { avatarAt: "" } });
  res.json({ ok: true });
}));
// Pictures for a list of accounts (?ids=a,b,c); accounts the viewer may not see are left out.
app.get("/api/avatars", auth, wrap(async (req, res) => {
  const ids = String(req.query.ids || "").split(",").map(toId).filter(Boolean).slice(0, 300);
  const targets = await users.find({ _id: { $in: ids } }).toArray();
  const allowed = [];
  for (const t of targets) if (await canSeeAvatarOf(req.user, t)) allowed.push(t._id);
  const out = {};
  for (const d of await avatars.find({ userId: { $in: allowed } }).toArray()) out[d.userId.toString()] = avatarUrl(d);
  res.json(out);
}));
// Setting or removing someone else's picture: teachers for their own students, admins for anyone.
async function managedTarget(req) {
  const id = toId(req.params.id);
  const target = id && await users.findOne({ _id: id });
  if (!target || (req.user.role === "teacher" && !(target.role === "student" && target.teacherId && target.teacherId.equals(req.user._id))))
    throw httpError(404, "That account is not in your class.");
  return target;
}
app.put("/api/users/:id/avatar", auth, allow("teacher", "admin"), wrap(async (req, res) => {
  const target = await managedTarget(req);
  const { mime, data } = parseAvatar((req.body || {}).image);
  const avatarAt = new Date().toISOString();
  await avatars.updateOne({ userId: target._id }, { $set: { mime, data, updatedAt: avatarAt } }, { upsert: true });
  await users.updateOne({ _id: target._id }, { $set: { avatarAt } });
  res.json({ avatarAt, image: avatarUrl({ mime, data }) });
}));
app.delete("/api/users/:id/avatar", auth, allow("teacher", "admin"), wrap(async (req, res) => {
  const id = (await managedTarget(req))._id;
  await avatars.deleteOne({ userId: id });
  await users.updateOne({ _id: id }, { $unset: { avatarAt: "" } });
  res.json({ ok: true });
}));

app.post("/api/teacher/class-code", auth, allow("teacher"), wrap(async (req, res) => {
  const classCode = await newClassCode();
  await users.updateOne({ _id: req.user._id }, { $set: { classCode } });
  res.json({ classCode }); // the old code stops working; students already in the class stay
}));

// --- Admin: every account ---
app.get("/api/admin/summary", auth, allow("admin"), wrap(async (req, res) => {
  const counts = await users.aggregate([{ $group: { _id: "$role", n: { $sum: 1 } } }]).toArray();
  const byRole = Object.fromEntries(ROLES.map(r => [r, 0]));
  counts.forEach(c => { byRole[c._id] = c.n; });
  const [pending, openRequests] = await Promise.all([users.countDocuments({ status: "pending" }), resetRequests.countDocuments({ status: "open" })]);
  res.json({ users: byRole, pending, openRequests, ...(await summaryFor({})) });
}));
app.get("/api/admin/requests", auth, allow("admin"), wrap(async (req, res) => {
  const list = await resetRequests.find({ status: "open" }).sort({ createdAt: -1 }).toArray();
  res.json(list.map(publicRequest));
}));
app.post("/api/admin/requests/:id/dismiss", auth, allow("admin"), wrap(async (req, res) => {
  const id = toId(req.params.id);
  const r = id && await resetRequests.updateOne({ _id: id, status: "open" }, { $set: { status: "dismissed", resolvedAt: new Date().toISOString(), resolvedBy: req.user._id } });
  if (!r || !r.matchedCount) throw httpError(404, "That request was not found.");
  res.json({ ok: true });
}));
app.get("/api/admin/users", auth, allow("admin"), wrap(async (req, res) => {
  const all = await users.find({}).sort({ role: 1, name: 1 }).toArray();
  const teachers = new Map(all.filter(u => u.role === "teacher").map(t => [t._id.toString(), t.name]));
  const studentCounts = {};
  all.forEach(u => { if (u.role === "student" && u.teacherId) studentCounts[u.teacherId] = (studentCounts[u.teacherId] || 0) + 1; });
  const students = new Map((await withStudentStats(all.filter(u => u.role === "student"))).map(s => [s.id, s]));
  res.json(all.map(u => {
    const id = u._id.toString();
    if (u.role === "student") return { ...students.get(id), teacherName: u.teacherId ? teachers.get(u.teacherId.toString()) || null : null };
    return { ...publicUser(u), studentCount: u.role === "teacher" ? studentCounts[id] || 0 : undefined };
  }));
}));
app.post("/api/admin/users", auth, allow("admin"), wrap(async (req, res) => {
  res.status(201).json(publicUser(await createUser(req.body || {})));
}));
app.patch("/api/admin/users/:id", auth, allow("admin"), wrap(async (req, res) => {
  const id = toId(req.params.id);
  const user = id && await users.findOne({ _id: id });
  if (!user) throw httpError(404, "Account not found.");
  const b = req.body || {}, set = {};
  if (b.name !== undefined) { set.name = cleanText(b.name, 60); if (!set.name) throw httpError(400, "Name cannot be empty."); }
  if (b.section !== undefined) set.section = cleanSection(b.section);
  if (b.password !== undefined) {
    if (typeof b.password !== "string" || b.password.length < 6) throw httpError(400, "Password needs at least 6 characters.");
    set.passwordHash = hashPassword(b.password);
  }
  if (b.teacherId !== undefined) {
    if (user.role !== "student") throw httpError(400, "Only students can be assigned to a teacher.");
    if (!b.teacherId) set.teacherId = null;
    else {
      const tId = toId(b.teacherId);
      if (!tId || !(await users.findOne({ _id: tId, role: "teacher" }))) throw httpError(400, "That teacher was not found.");
      set.teacherId = tId;
    }
  }
  if (b.status !== undefined) {
    if (b.status !== "active") throw httpError(400, "To turn down a sign-up, delete the account.");
    set.status = "active"; // approve a teacher who signed up
  }
  await users.updateOne({ _id: id }, { $set: set });
  if (set.passwordHash) { await logins.deleteMany({ userId: id }); await resolveRequests(id, req.user._id); }
  // Moving a student moves their past games to the new teacher's reports too.
  if (b.teacherId !== undefined) await sessions.updateMany({ userId: id }, { $set: { teacherId: set.teacherId } });
  res.json(publicUser({ ...user, ...set }));
}));
app.delete("/api/admin/users/:id", auth, allow("admin"), wrap(async (req, res) => {
  const id = toId(req.params.id);
  if (!id) throw httpError(404, "Account not found.");
  if (id.equals(req.user._id)) throw httpError(400, "You cannot delete your own account.");
  const user = await users.findOne({ _id: id });
  if (!user) throw httpError(404, "Account not found.");
  if (user.role === "admin" && (await users.countDocuments({ role: "admin" })) <= 1) throw httpError(400, "Keep at least one admin account.");
  await users.deleteOne({ _id: id });
  await logins.deleteMany({ userId: id });
  await progress.deleteMany({ userId: id });
  await resetRequests.deleteMany({ userId: id });
  await avatars.deleteMany({ userId: id });
  if (user.role === "teacher") await users.updateMany({ teacherId: id }, { $set: { teacherId: null } }); // students stay, unassigned
  res.json({ ok: true }); // past game records are kept for reports
}));

// Serve the frontend and PWA from the same origin.
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "..", "frontend", "index.html")));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.status) return res.status(error.status).json({ error: error.message });
  if (error.code === 11000) return res.status(409).json({ error: "That username is already taken." });
  console.error("Request failed:", error);
  res.status(500).json({ error: "The request could not be completed." });
});

async function start() {
  await mongoClient.connect();
  const db = mongoClient.db(databaseName);
  sessions = db.collection("sessions");
  users = db.collection("users");
  logins = db.collection("logins");
  progress = db.collection("progress");
  resetRequests = db.collection("resetRequests");
  avatars = db.collection("avatars");
  await avatars.createIndex({ userId: 1 }, { unique: true });
  await Promise.all([
    resetRequests.createIndex({ status: 1, teacherId: 1 }),
    users.createIndex({ classCode: 1 }),
    sessions.createIndex({ created_at: -1, _id: -1 }),
    sessions.createIndex({ userId: 1 }),
    sessions.createIndex({ teacherId: 1 }),
    users.createIndex({ username: 1 }, { unique: true }),
    users.createIndex({ teacherId: 1 }),
    logins.createIndex({ tokenHash: 1 }, { unique: true }),
    logins.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }), // expired logins are removed automatically
    progress.createIndex({ userId: 1 }, { unique: true })
  ]);
  // First run: create the first admin so someone can log in and create the other accounts.
  if (!(await users.findOne({ role: "admin" }))) {
    const password = process.env.ADMIN_PASSWORD || "admin123";
    await createUser({ username: "admin", name: "Administrator", role: "admin", password });
    console.log("Created the first admin account.");
    console.log(`  Username: admin   Password: ${process.env.ADMIN_PASSWORD ? "(the ADMIN_PASSWORD you set)" : "admin123"}`);
    console.log("  Log in and change this password from My account.");
  }
  // Teachers created before class codes existed get one now.
  for (const t of await users.find({ role: "teacher", classCode: { $exists: false } }).toArray()) {
    await users.updateOne({ _id: t._id }, { $set: { classCode: await newClassCode() } });
  }
  app.listen(PORT, () => console.log(`Mathinik Quest running at http://localhost:${PORT}`));
}

start().catch(async error => {
  console.error(`Could not connect to MongoDB database "${databaseName}":`, error);
  await mongoClient.close();
  process.exitCode = 1;
});
