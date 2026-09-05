/* Site content. Edit this file directly, or use admin.html (password protected).
   Text fields support **bold** and line breaks. */
window.SITE_CONTENT = {
  "site": {
    "title": "Minjoon Jack Kim",
    "brand": "Minjoon Jack Kim",
    "footer": "© 2026 Minjoon Jack Kim",
    "footerNote": "Seoul · State College"
  },
  "profile": {
    "name": "Minjoon Jack Kim",
    "nameKo": "김민준",
    "photo": "images/profile.jpg",
    "roles": [
      "RLWRLD Robotics Transformation Consultant Intern",
      "Computer Science & Statistics Student"
    ],
    "contact": [
      { "label": "Affiliation", "value": "Penn State (B.S. '28)\nRLWRLD (Intern)", "href": "" },
      { "label": "Location", "value": "Seoul, Republic of Korea", "href": "" },
      { "label": "Email", "value": "minjoonkim15@gmail.com", "href": "mailto:minjoonkim15@gmail.com" },
      { "label": "Phone", "value": "+82 10-6295-3580", "href": "tel:+821062953580" },
      { "label": "LinkedIn", "value": "linkedin.com/in/…", "href": "https://www.linkedin.com/" }
    ],
    "focus": [
      "Robotics Deployment",
      "Physical AI",
      "Consulting",
      "Data Platforms",
      "Valuation & M&A",
      "Reinforcement Learning"
    ]
  },
  "tabs": [
    {
      "id": "about",
      "label": "About me",
      "blocks": [
        {
          "type": "text",
          "title": "About",
          "paragraphs": [
            "Computer science and statistics student at **Penn State**, currently in Seoul as a Robotics Transformation consultant intern at **RLWRLD**. I work where finance, data, and physical AI meet: sizing the economics of robot deployments, building the data platforms behind them, and translating both for clients and investors."
          ]
        },
        {
          "type": "entries",
          "title": "Experience",
          "entries": [
            {
              "heading": "Robotics Transformation (RX) Consultant Intern",
              "org": "RLWRLD",
              "location": "Seoul, South Korea",
              "when": "May 2026 – Present",
              "current": true,
              "bullets": [
                "**Lotte Hotel.** Led client engagement analysis across four 4- and 5-star properties, running on-site due diligence and benchmarking each hotel on operating scope, labor structure, P&L attribution, and ownership approval structure to support a robotics deployment contract proposal.",
                "Built the core argument for accelerating contract initiation to November 2026, structured around four rationales (learning-curve economics, competitive pre-emption, schedule dependency, SOP transition timing) and presented to the client's senior management.",
                "Supported the CJ Logistics project team on a robotics PoC proposal for one of Korea's largest logistics providers, contributing market research and deliverable preparation.",
                "Prepared a pitch deck for a leading global electronics manufacturer, structuring the client's automation constraints into a three-part narrative (strategic rationale, economic drivers, execution roadmap) and analyzing demand across four robot deployment categories.",
                "Contributed to the company IR deck: architecture visuals, competitive differentiation slides (vs. Scale AI, Encord), and the full English translation of the methodology section for global investors.",
                "**RXDE.** Owned end-to-end development of the company's production data platform on AWS (EC2, RDS PostgreSQL, S3), designing a unified five-table schema adopted company-wide and running cost-performance benchmarks that informed a GPU infrastructure investment decision.",
                "Developed a task feasibility evaluation framework scoring robotic deployment readiness across 28 sub-criteria on 7 performance axes, standardizing go/no-go assessment for enterprise PoC prioritization, iterated in direct alignment with the R&D team."
              ]
            },
            {
              "heading": "Research Assistant",
              "org": "William Hansan · PE, M&A Advisory",
              "location": "Seoul, South Korea",
              "when": "Mar 2026 – May 2026",
              "current": false,
              "bullets": [
                "Part-time industry research across the TMT sector with a focus on the Korean robotics landscape, analyzing key players across industrial robots and component sub-segments.",
                "Assessed potential acquisition targets by evaluating revenue scale, margin profile, and ownership structure for deal origination."
              ]
            },
            {
              "heading": "Military Service, Republic of Korea",
              "org": "Seoul Metropolitan Corporation",
              "location": "Voluntary enlistment",
              "when": "Aug 2024 – May 2026",
              "current": false,
              "bullets": [
                "Managed surveillance systems across a metro station to ensure passenger safety.",
                "Used off-duty hours to self-study for and write two levels of the CFA Program."
              ]
            }
          ]
        },
        {
          "type": "entries",
          "title": "Education",
          "entries": [
            {
              "heading": "Pennsylvania State University",
              "org": "B.S. Computer Science, Minor in Statistics · GPA 3.70 / 4.0",
              "location": "Pennsylvania, United States",
              "when": "Expected May 2028",
              "current": false,
              "bullets": []
            },
            {
              "heading": "CFA Institute",
              "org": "Chartered Financial Analyst Program",
              "location": "",
              "when": "Level II Candidate",
              "current": false,
              "bullets": []
            },
            {
              "heading": "American International School of Cape Town",
              "org": "",
              "location": "Cape Town, South Africa",
              "when": "Class of 2021",
              "current": false,
              "bullets": []
            }
          ]
        },
        {
          "type": "entries",
          "title": "Extracurricular",
          "entries": [
            {
              "heading": "Associate Trainee",
              "org": "Nittany Lion Consulting Group · Consulting Training Program",
              "location": "Pennsylvania, United States",
              "when": "Jan 2024 – May 2024",
              "current": false,
              "bullets": [
                "Highly selective ten-week bootcamp in consulting fundamentals: market sizing, issue tree analysis, hypothesis-driven problem solving, and client communication frameworks.",
                "Participated in five mock consulting interviews and collaborated in four-person teams to deliver structured recommendations and presentations, earning recognition for analytical rigor and clear communication."
              ]
            },
            {
              "heading": "Vice President, Information Technology & Communications",
              "org": "Penn State Capital College Student Investment Fund",
              "location": "Pennsylvania, United States",
              "when": "Oct 2021 – May 2023",
              "current": false,
              "bullets": [
                "Produced valuation reports and industry briefs using DCF models, comparable company analysis, and EDGAR data, presenting buy/sell recommendations to the investment committee.",
                "Managed a $1M simulated portfolio, generating a 35% profit during the reporting cycle through sector rotation analysis and relative strength screening."
              ]
            }
          ]
        },
        {
          "type": "table",
          "title": "Projects",
          "rows": [
            { "name": "Blackjack RL", "text": "Q-learning agent built in Gymnasium, with an integrated GUI to visualize how the model interacts with the environment.", "tag": "Python" },
            { "name": "Chess AI", "text": "Evaluation function and minimax algorithm with alpha-beta pruning to enhance move selection.", "tag": "Python" },
            { "name": "Airbnb Pricing", "text": "Regression and stepwise model selection to analyze rental price drivers from socio-economic datasets.", "tag": "R" }
          ]
        },
        {
          "type": "skills",
          "title": "Skills",
          "rows": [
            { "label": "Programming", "items": ["Python", "C++", "C", "C#", "Java", "SQL", "R", "Linux"], "text": "" },
            { "label": "Infrastructure", "items": ["AWS EC2", "RDS PostgreSQL", "S3"], "text": "" },
            { "label": "Office", "items": [], "text": "Microsoft Office Specialist Expert 2016 (Excel, PowerPoint, Word) · License EF16D26" },
            { "label": "Finance", "items": [], "text": "DCF and comparable company valuation, P&L attribution, deal screening, CFA Level II curriculum" }
          ]
        }
      ]
    },
    {
      "id": "study",
      "label": "Study",
      "blocks": [
        {
          "type": "text",
          "title": "What I'm learning, and why",
          "paragraphs": [
            "Two tracks run in parallel: a computer science degree with a statistics minor, and the CFA Program. One teaches me how systems are built, the other how they're valued. The robotics work at RLWRLD is where the two meet."
          ]
        },
        {
          "type": "stats",
          "title": "At a glance",
          "stats": [
            { "value": "3.70", "label": "GPA / 4.0, Penn State" },
            { "value": "Level II", "label": "CFA Program candidate" },
            { "value": "2028", "label": "Expected graduation" }
          ]
        },
        {
          "type": "entries",
          "title": "Degree",
          "entries": [
            {
              "heading": "B.S. Computer Science, Minor in Statistics",
              "org": "Pennsylvania State University",
              "location": "",
              "when": "2021 – 2028",
              "current": true,
              "bullets": [
                "**Computer science.** Algorithms, data structures, systems programming in C and C++, object-oriented design in Java and C#, databases and SQL.",
                "**Statistics.** Regression, model selection, and applied data analysis in R, the foundation for the Airbnb pricing project and the feasibility scoring framework at RLWRLD.",
                "**Applied AI.** Reinforcement learning (Q-learning in Gymnasium) and adversarial search (minimax with alpha-beta pruning), built as standalone projects."
              ]
            }
          ]
        },
        {
          "type": "entries",
          "title": "CFA Program",
          "entries": [
            {
              "heading": "Chartered Financial Analyst, Level II Candidate",
              "org": "CFA Institute",
              "location": "",
              "when": "2024 – Present",
              "current": true,
              "bullets": [
                "Self-studied and wrote two levels of the CFA exams during military service, using off-duty hours over roughly 21 months.",
                "Core areas applied at work: equity valuation, financial statement analysis, corporate finance, and portfolio management."
              ]
            }
          ]
        },
        {
          "type": "table",
          "title": "Certifications",
          "rows": [
            { "name": "MOS Expert 2016", "text": "Microsoft Office Specialist Expert: Excel, PowerPoint, Word.", "tag": "License EF16D26" },
            { "name": "NLCG Training Program", "text": "Ten-week consulting bootcamp at Penn State: market sizing, issue trees, hypothesis-driven problem solving, client communication.", "tag": "Jan – May 2024" }
          ]
        },
        {
          "type": "text",
          "title": "Currently reading",
          "paragraphs": [
            "CFA Level II curriculum, with a focus on equity and fixed income valuation. Alongside it, papers and technical reports on robot foundation models and imitation learning, to keep pace with the R&D team."
          ]
        }
      ]
    },
    {
      "id": "hobbies",
      "label": "Hobbies",
      "blocks": [
        {
          "type": "text",
          "title": "Long distances, and the occasional hand of poker",
          "paragraphs": [
            "Endurance sport is the other half of my week. Most of it is running and triathlon; the rest is Hyrox, which is what happens when a race puts a gym in the middle of a run."
          ]
        },
        {
          "type": "cards",
          "title": "Disciplines",
          "cards": [
            {
              "meta": "Triathlon",
              "title": "Ironman 70.3",
              "text": "Half-distance triathlon. Three sports, one clock, and a long day of pacing decisions.",
              "facts": [
                { "label": "Swim", "value": "1.9 km" },
                { "label": "Bike", "value": "90 km" },
                { "label": "Run", "value": "21.1 km" }
              ]
            },
            {
              "meta": "Running",
              "title": "Marathon",
              "text": "The distance where fueling and negative splits matter more than fitness alone.",
              "facts": [
                { "label": "Distance", "value": "42.195 km" }
              ]
            },
            {
              "meta": "Trail & road",
              "title": "Ultramarathon",
              "text": "Anything past the marathon. I race the 50 km and 100 km distances, where the goal shifts from speed to staying steady for hours.",
              "facts": [
                { "label": "Distances", "value": "50 km · 100 km" }
              ]
            },
            {
              "meta": "Fitness racing",
              "title": "Hyrox",
              "text": "Eight 1 km runs, each followed by a workout station: SkiErg, sled push and pull, burpee broad jumps, rowing, farmers carry, sandbag lunges, wall balls.",
              "facts": [
                { "label": "Format", "value": "8 × 1 km + 8 stations" }
              ]
            }
          ]
        },
        {
          "type": "text",
          "title": "Poker",
          "paragraphs": [
            "Off the course, I play poker, mostly for the math. Pot odds, expected value, and reading incomplete information are the same skills that show up in valuation and in deciding whether a robot deployment is worth the contract."
          ]
        }
      ]
    }
  ]
};
