const postgres = require("postgres");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

const updates = [
  {
    courseCode: "650066",
    sectionCode: "855",
    dayOfWeek: 1,
    startTime: "07:00:00",
    endTime: "09:00:00",
    classroom: "H-402",
    colorHex: "#3F91DC",
  },
  {
    courseCode: "650066",
    sectionCode: "855",
    dayOfWeek: 3,
    startTime: "07:00:00",
    endTime: "10:00:00",
    classroom: "VIRTUAL",
    colorHex: "#3F91DC",
  },
  {
    courseCode: "650030",
    sectionCode: "854",
    dayOfWeek: 2,
    startTime: "07:00:00",
    endTime: "09:00:00",
    classroom: "I1-205",
    colorHex: "#36CF49",
  },
  {
    courseCode: "650030",
    sectionCode: "854",
    dayOfWeek: 5,
    startTime: "07:00:00",
    endTime: "10:00:00",
    classroom: "I1-205",
    colorHex: "#36CF49",
  },
  {
    courseCode: "1327",
    sectionCode: "856",
    dayOfWeek: 2,
    startTime: "17:00:00",
    endTime: "20:00:00",
    classroom: "L3-301",
    colorHex: "#F94B3F",
  },
  {
    courseCode: "1327",
    sectionCode: "856",
    dayOfWeek: 5,
    startTime: "17:00:00",
    endTime: "20:00:00",
    classroom: "I2-104",
    colorHex: "#F94B3F",
  },
  {
    courseCode: "650028",
    sectionCode: "851",
    dayOfWeek: 2,
    startTime: "20:00:00",
    endTime: "22:00:00",
    classroom: "I2-204",
    colorHex: "#B84FD8",
  },
  {
    courseCode: "650028",
    sectionCode: "851",
    dayOfWeek: 5,
    startTime: "20:00:00",
    endTime: "22:00:00",
    classroom: "L3-301",
    colorHex: "#B84FD8",
  },
  {
    courseCode: "650076",
    sectionCode: "852",
    dayOfWeek: 3,
    startTime: "20:00:00",
    endTime: "22:00:00",
    classroom: "I2-103",
    colorHex: "#DB3A96",
  },
  {
    courseCode: "650076",
    sectionCode: "852",
    dayOfWeek: 6,
    startTime: "10:00:00",
    endTime: "13:00:00",
    classroom: "I2-103",
    colorHex: "#DB3A96",
  },
  {
    courseCode: "650042",
    sectionCode: "851",
    dayOfWeek: 4,
    startTime: "18:00:00",
    endTime: "20:00:00",
    classroom: "VIRTUAL",
    colorHex: "#F6C300",
  },
  {
    courseCode: "650042",
    sectionCode: "851",
    dayOfWeek: 6,
    startTime: "07:00:00",
    endTime: "09:00:00",
    classroom: "N-409",
    colorHex: "#F6C300",
  },
];

async function run() {
  const patched = [];
  const missing = [];

  try {
    for (const item of updates) {
      const rows = await sql`
        update schedule_session ss
        set classroom = ${item.classroom},
            color_hex = ${item.colorHex}
        from section sec
        join course_offering co on co.id = sec.course_offering_id
        join course c on c.id = co.course_id
        where ss.section_id = sec.id
          and c.code = ${item.courseCode}
          and sec.code = ${item.sectionCode}
          and ss.day_of_week = ${item.dayOfWeek}
          and ss.start_time = ${item.startTime}
          and ss.end_time = ${item.endTime}
        returning
          ss.id as schedule_session_id,
          c.code as course_code,
          c.name as course_name,
          sec.code as section_code,
          ss.day_of_week,
          ss.start_time,
          ss.end_time,
          ss.classroom,
          ss.color_hex
      `;

      if (rows.length !== 1) {
        missing.push(item);
      } else {
        patched.push(rows[0]);
      }
    }

    console.log(`Patched ${patched.length}/${updates.length} schedule sessions.`);
    console.table(patched);

    if (missing.length > 0) {
      console.error("Missing or ambiguous schedule sessions:");
      console.table(missing);
      process.exitCode = 1;
    }
  } finally {
    await sql.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
