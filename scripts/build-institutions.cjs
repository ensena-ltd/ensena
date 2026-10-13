// Builds src/data/institutions.json (served by /api/institutions) from the
// Hipo world-universities list (https://github.com/Hipo/university-domains-list)
// plus curated Nigeria/Ghana additions (polytechnics, colleges of education,
// newer universities). Re-run to refresh:
//   curl -sL -o world_unis.json https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json
//   node scripts/build-institutions.cjs world_unis.json src/data/institutions.json
const fs = require("fs");
const path = require("path");
const world = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), "utf8"));
const keys = ["Nigeria","Ghana","Kenya","South Africa","Cameroon","Uganda","Tanzania, United Republic of","Rwanda","Egypt","Ethiopia","Zambia","Zimbabwe","United Kingdom","Ireland","United States","Canada","Australia","India"];
const fixes = { "Kwara State Polytecnic": "Kwara State Polytechnic", "University of Portharcourt": "University of Port Harcourt", "Rivers State University of Science and Technology": "Rivers State University" };
const extra = {
  Nigeria: {
    u: ["Federal University Oye-Ekiti","Federal University Lokoja","Federal University of Lafia","Federal University Dutse","Federal University Dutsin-Ma","Federal University Kashere","Federal University Wukari","Federal University Gashua","Federal University Gusau","Federal University Birnin Kebbi","Federal University Otuoke","Alex Ekwueme Federal University, Ndufu-Alike","Joseph Sarwuan Tarka University, Makurdi","Federal University of Agriculture, Abeokuta","Ibrahim Badamasi Babangida University, Lapai","Air Force Institute of Technology, Kaduna","Nigerian Army University, Biu","Nigeria Maritime University, Okerenkoko","Federal University of Health Sciences, Otukpo","Federal University of Health Sciences, Azare","Federal University of Health Sciences, Ila-Orangun","David Umahi Federal University of Health Sciences, Uburu","Lagos State University of Science and Technology","Lagos State University of Education","Delta State University, Abraka","Delta State University of Science and Technology, Ozoro","Dennis Osadebay University, Asaba","Edo State University, Uzairue","Ignatius Ajuru University of Education","Chukwuemeka Odumegwu Ojukwu University","Emmanuel Alayande University of Education, Oyo","Prince Abubakar Audu University, Anyigba","Yobe State University","Plateau State University, Bokkos","Sule Lamido University, Kafin Hausa","Bamidele Olumilua University of Education, Ikere","University of Ilesa","Olusegun Agagu University of Science and Technology, Okitipupa","University of Medical Sciences, Ondo","University of Cross River State","Bayelsa Medical University","Borno State University","Yusuf Maitama Sule University, Kano","Zamfara State University","Pan-Atlantic University","Elizade University","Anchor University, Lagos","Augustine University, Ilara-Epe","Chrisland University","Edwin Clark University","Evangel University, Akaeze","Gregory University, Uturu","Hallmark University","Kings University, Ode-Omu","McPherson University","Mountain Top University","Precious Cornerstone University","Samuel Adegboyega University","Skyline University Nigeria","Southwestern University, Nigeria","Summit University, Offa","Trinity University, Yaba","Christopher University","Dominican University, Ibadan","Admiralty University of Nigeria","Clifford University","Coal City University","Spiritan University, Nneochi","Atiba University","Rhema University","PAMO University of Medical Sciences","Eko University of Medicine and Health Sciences","Thomas Adewumi University","Micheal and Cecilia Ibru University"],
    p: ["Federal Polytechnic Nekede","Federal Polytechnic Ilaro","Federal Polytechnic Bida","Federal Polytechnic Ado-Ekiti","Federal Polytechnic Oko","Federal Polytechnic Idah","Federal Polytechnic Mubi","Federal Polytechnic Bauchi","Federal Polytechnic Nasarawa","Federal Polytechnic Ede","Federal Polytechnic Kaura Namoda","Federal Polytechnic Damaturu","Federal Polytechnic Ekowe","Federal Polytechnic Ukana","Federal Polytechnic Ile-Oluji","Federal Polytechnic of Oil and Gas, Bonny","Waziri Umaru Federal Polytechnic, Birnin Kebbi","Hussaini Adamu Federal Polytechnic, Kazaure","Kaduna Polytechnic","Institute of Management and Technology, Enugu","Moshood Abiola Polytechnic, Abeokuta","Rufus Giwa Polytechnic, Owo","Osun State Polytechnic, Iree","Ken Saro-Wiwa Polytechnic, Bori","Delta State Polytechnic, Ogwashi-Uku","Delta State Polytechnic, Otefe-Oghara","Kano State Polytechnic","Gateway Polytechnic, Saapade","Federal College of Animal Health and Production Technology, Ibadan"],
    c: ["Federal College of Education, Zaria","Federal College of Education, Abeokuta","Alvan Ikoku Federal College of Education, Owerri","Federal College of Education, Kano","Federal College of Education, Pankshin","Federal College of Education, Okene","Federal College of Education, Obudu","Federal College of Education, Eha-Amufu","Federal College of Education (Special), Oyo","Federal College of Education, Yola","Federal College of Education, Katsina","Federal College of Education, Kontagora","Federal College of Education, Iwo","Federal College of Education (Technical), Asaba","Federal College of Education (Technical), Omoku","Federal College of Education (Technical), Umunze","Federal College of Education (Technical), Gombe","Federal College of Education (Technical), Potiskum","Federal College of Education (Technical), Gusau","Federal College of Education (Technical), Bichi","Adeniran Ogunsanya College of Education","Michael Otedola College of Primary Education","Kwara State College of Education, Ilorin","Nwafor Orizu College of Education, Nsugbe","Enugu State College of Education (Technical)","Isa Kaita College of Education, Dutsin-Ma","Kaduna State College of Education, Gidan Waya","Osun State College of Education, Ilesa"],
  },
  Ghana: {
    u: [],
    p: ["Accra Technical University","Kumasi Technical University","Takoradi Technical University","Ho Technical University","Koforidua Technical University","Cape Coast Technical University","Tamale Technical University","Sunyani Technical University","Bolgatanga Technical University","Dr. Hilla Limann Technical University"],
    c: [],
  },
};
function typeOf(name) {
  if (/polytechnic|polytecnic|college of technology|technical college|technical university|monotechnic/i.test(name)) return "p";
  if (/college of education|college of primary education/i.test(name)) return "c";
  return "u";
}
const out = {};
for (const key of keys) {
  const seen = new Map();
  const add = (name, t) => {
    const clean = (fixes[name] ?? name).replace(/\s+/g, " ").trim();
    const k = clean.toLowerCase();
    if (!seen.has(k)) seen.set(k, { n: clean, t: t ?? typeOf(clean) });
  };
  for (const u of world) if (u.country === key) add(u.name);
  const ex = extra[key];
  if (ex) for (const t of ["u", "p", "c"]) for (const n of ex[t]) add(n, t);
  out[key] = [...seen.values()].sort((a, b) => a.n.localeCompare(b.n));
}
const dest = path.resolve(process.argv[3]);
fs.writeFileSync(dest, JSON.stringify(out));
for (const k of keys) { const l = out[k]; console.log(k.padEnd(30), l.length, "u:", l.filter(x=>x.t==="u").length, "p:", l.filter(x=>x.t==="p").length, "c:", l.filter(x=>x.t==="c").length); }
console.log("bytes", fs.statSync(dest).size);
