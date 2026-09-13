// Placeholder import - replace with actual images
import placeholderAvatar from '../assets/images/placeholder-avatar.png';
export { placeholderAvatar };

export const speakersData = {
  chiefGuest: {
    id: 'chief-guest',
    name: 'Shri Santosh Kumar Gangwar',
    title: 'Hon\'ble Governor of Jharkhand',
    role: 'Chief Guest',
    designation: 'Governor',
    institution: 'Government of Jharkhand',
    photo: null, // Will be added later
    teaser: 'Distinguished administrator serving as the Constitutional Head of Jharkhand, bringing decades of public service experience to the conference.',
    bio: 'Shri Santosh Kumar Gangwar serves as the Hon\'ble Governor of Jharkhand, representing the President of India as the Constitutional Head of the state. With extensive experience in public administration and governance, he brings a wealth of insight into regional development, industrial policy, and the integration of technology with sustainable governance. His presence at NYSC-2026 underscores the state government\'s commitment to fostering scientific inquiry and supporting the next generation of researchers addressing Jharkhand\'s unique challenges in mining safety and earth observation.',
    session: null, // Political figure, no technical session
    topic: 'Governance',
    date: 'Day 1',
    format: 'Inaugural'
  },
  
  guestOfHonour: {
    id: 'guest-of-honour',
    name: 'Shri Hemant Soren',
    title: 'Hon\'ble Chief Minister of Jharkhand',
    role: 'Guest of Honour',
    designation: 'Chief Minister',
    institution: 'Government of Jharkhand',
    photo: null,
    teaser: 'Visionary leader driving Jharkhand\'s development agenda with focus on mineral resource management and sustainable industrial growth.',
    bio: 'Shri Hemant Soren, the Hon\'ble Chief Minister of Jharkhand, has been instrumental in shaping the state\'s development trajectory with particular emphasis on responsible mining practices, tribal welfare, and sustainable resource management. Under his leadership, Jharkhand has prioritized the integration of modern technologies in mining safety, environmental monitoring, and geological survey operations. His support for NYSC-2026 reflects the state government\'s vision of positioning Jharkhand as a hub for geospatial research and mining innovation, leveraging the state\'s rich mineral heritage while ensuring ecological balance and worker safety.',
    session: null,
    topic: 'Governance',
    date: 'Day 1',
    format: 'Inaugural'
  },

  academicSpeakers: [
    {
      id: 'prof-bhanwar',
      name: 'Prof. Bhanwar Singh Choudhary',
      title: 'Professor, Department of Mining Engineering',
      role: 'Keynote Speaker',
      designation: 'Professor',
      institution: 'Indian Institute of Technology (ISM) Dhanbad',
      photo: null,
      teaser: 'Leading expert in mining engineering with extensive research in mine ventilation, rock mechanics, and underground mining safety protocols.',
      bio: 'Prof. Bhanwar Singh Choudhary is a distinguished Professor in the Department of Mining Engineering at IIT (ISM) Dhanbad, one of India\'s premier institutions for mining education and research. With over two decades of academic and research experience, he has made significant contributions to the fields of mine ventilation, rock mechanics, and underground mining safety. His research focuses on developing advanced monitoring systems for detecting hazardous conditions in underground mines, particularly in the coal-bearing regions of Jharkhand and Bihar. Prof. Choudhary has published extensively in national and international journals and has guided numerous doctoral scholars. At NYSC-2026, he will deliver a keynote address on integrating remote sensing technologies with traditional mining safety practices to create comprehensive hazard mitigation frameworks.',
      session: {
        title: 'Advanced Monitoring Systems for Underground Mine Safety',
        description: 'This keynote presentation will explore the integration of satellite-based remote sensing, IoT sensors, and traditional geotechnical monitoring to create comprehensive safety frameworks for underground mining operations. The talk will cover real-time hazard detection, predictive analytics for slope stability, and case studies from Jharkhand\'s coal mining regions.',
        date: 'Day 1',
        time: '10:00 AM - 11:00 AM',
        venue: 'Main Auditorium'
      },
      topic: 'Mining Safety',
      date: 'Day 1',
      format: 'Keynote'
    },
    {
      id: 'prof-dheeraj',
      name: 'Prof. Dheeraj Kumar',
      title: 'Professor, Department of Mining Engineering',
      role: 'Keynote Speaker',
      designation: 'Professor',
      institution: 'Indian Institute of Technology (ISM) Dhanbad',
      photo: null,
      teaser: 'Specializes in mine planning, numerical modeling, and sustainable extraction techniques for complex geological formations.',
      bio: 'Prof. Dheeraj Kumar serves as Professor in the Department of Mining Engineering at IIT (ISM) Dhanbad, where his research focuses on mine planning, numerical modeling of rock structures, and sustainable extraction techniques for complex geological formations. His work has been instrumental in developing optimized mining methods for the challenging geological conditions prevalent in Jharkhand\'s coal and mineral belts. Prof. Kumar has collaborated extensively with industry partners including CCL, BCCL, and CMPDI to implement research findings in operational mining environments. His expertise in numerical simulation and geotechnical engineering makes him a key voice in advancing mining safety through technology. At the conference, he will present on the application of advanced computational methods for predicting ground behavior and optimizing mine design.',
      session: {
        title: 'Numerical Modeling for Mine Design and Ground Control',
        description: 'This technical presentation will demonstrate how advanced numerical modeling techniques can predict ground behavior, optimize mine layouts, and enhance safety in complex geological conditions. Case studies from Jharkhand mining operations will illustrate practical applications.',
        date: 'Day 1',
        time: '11:30 AM - 12:30 PM',
        venue: 'Main Auditorium'
      },
      topic: 'Mining Safety',
      date: 'Day 1',
      format: 'Keynote'
    },
    {
      id: 'prof-vsrathore',
      name: 'Prof. (Dr.) V. S. Rathore',
      title: 'Professor, Remote Sensing',
      role: 'Keynote Speaker',
      designation: 'Professor',
      institution: 'Birla Institute of Technology (BIT) Mesra',
      photo: null,
      teaser: 'Pioneer in applying satellite remote sensing for environmental monitoring, land-use mapping, and geological hazard assessment in eastern India.',
      bio: 'Prof. (Dr.) V. S. Rathore is a distinguished Professor of Remote Sensing at BIT Mesra, Ranchi, with extensive expertise in satellite-based environmental monitoring, land-use mapping, and geological hazard assessment. His research has been pivotal in applying remote sensing technologies to address regional challenges in Jharkhand, including mining subsidence monitoring, forest cover analysis, and urban expansion tracking. Prof. Rathore has led multiple projects funded by ISRO and the Ministry of Environment, focusing on developing operational systems for disaster risk reduction and natural resource management. His work bridges the gap between satellite data acquisition and practical decision-making for government agencies and industry. At NYSC-2026, he will present on leveraging multi-spectral satellite data for comprehensive environmental impact assessment in mining regions.',
      session: {
        title: 'Satellite Remote Sensing for Environmental Impact Assessment in Mining Regions',
        description: 'This presentation will showcase how multi-spectral satellite imagery from ISRO\'s Earth observation satellites can be used for comprehensive environmental monitoring in mining areas. Topics include subsidence detection, water quality assessment, vegetation health monitoring, and post-mining land reclamation tracking.',
        date: 'Day 2',
        time: '09:30 AM - 10:30 AM',
        venue: 'Main Auditorium'
      },
      topic: 'Remote Sensing',
      date: 'Day 2',
      format: 'Keynote'
    },
    {
      id: 'dr-jeganathan',
      name: 'Dr. C. Jeganathan',
      title: 'Professor, Remote Sensing',
      role: 'Keynote Speaker',
      designation: 'Professor',
      institution: 'Birla Institute of Technology (BIT) Mesra',
      photo: null,
      teaser: 'Expert in GIS applications for natural resource management, spatial analysis, and geospatial decision support systems for sustainable development.',
      bio: 'Dr. C. Jeganathan is a Professor of Remote Sensing at BIT Mesra, specializing in GIS applications for natural resource management, spatial analysis, and the development of geospatial decision support systems. His research focuses on integrating satellite data with ground-based observations to create actionable insights for sustainable development planning. Dr. Jeganathan has worked extensively on projects involving watershed management, mineral exploration mapping, and urban planning using geospatial technologies. His contributions to developing user-friendly GIS tools for government departments have facilitated evidence-based policy making in Jharkhand and neighboring states. At the conference, he will discuss the role of integrated geospatial platforms in supporting sustainable mining practices and environmental governance.',
      session: {
        title: 'Integrated Geospatial Platforms for Sustainable Mining and Environmental Governance',
        description: 'This talk will present frameworks for integrating multi-source geospatial data (satellite imagery, drone surveys, ground sensors) into unified decision support systems for mining regulation, environmental compliance monitoring, and sustainable resource management.',
        date: 'Day 2',
        time: '11:00 AM - 12:00 PM',
        venue: 'Seminar Hall 1'
      },
      topic: 'Remote Sensing',
      date: 'Day 2',
      format: 'Keynote'
    },
    {
      id: 'dr-akhilesh',
      name: 'Dr. Akhilesh Kumar',
      title: 'Head of Department, Electronics & Communication Engineering',
      role: 'Keynote Speaker',
      designation: 'Professor & HOD',
      institution: 'National Institute of Technology (NIT) Jamshedpur',
      photo: null,
      teaser: 'Leading researcher in sensor technologies, IoT systems for industrial monitoring, and embedded solutions for harsh mining environments.',
      bio: 'Dr. Akhilesh Kumar serves as Professor and Head of the Electronics & Communication Engineering Department at NIT Jamshedpur. His research interests include sensor technologies, IoT systems for industrial monitoring, and embedded solutions designed for harsh environments such as underground mines. Dr. Kumar has developed several prototype systems for real-time monitoring of mine ventilation, gas detection, and equipment health, working in collaboration with industry partners in Jharkhand\'s mining sector. His work focuses on making advanced monitoring technologies affordable and robust enough for deployment in resource-constrained settings. At NYSC-2026, he will present on developing cost-effective IoT solutions for mine safety monitoring that can be scaled across small and medium mining operations.',
      session: {
        title: 'Cost-Effective IoT Solutions for Real-Time Mine Safety Monitoring',
        description: 'This presentation will showcase prototype IoT systems developed for continuous monitoring of mine ventilation, gas levels, and equipment conditions. The talk will cover sensor selection, wireless communication in underground environments, data analytics, and deployment strategies for small and medium mining operations.',
        date: 'Day 1',
        time: '02:00 PM - 03:00 PM',
        venue: 'Seminar Hall 1'
      },
      topic: 'Mining Safety',
      date: 'Day 1',
      format: 'Keynote'
    },
    {
      id: 'prof-sanjay',
      name: 'Prof. Sanjay Kumar',
      title: 'Associate Professor, Civil Engineering',
      role: 'Keynote Speaker',
      designation: 'Associate Professor',
      institution: 'National Institute of Technology (NIT) Jamshedpur',
      photo: null,
      teaser: 'Specializes in geotechnical engineering, slope stability analysis, and infrastructure resilience in mining-affected regions.',
      bio: 'Prof. Sanjay Kumar is an Associate Professor in the Civil Engineering Department at NIT Jamshedpur, specializing in geotechnical engineering, slope stability analysis, and infrastructure resilience in regions affected by mining activities. His research addresses the challenges of constructing and maintaining infrastructure in areas subject to ground subsidence, slope instability, and other mining-induced geotechnical hazards. Prof. Kumar has conducted extensive field studies in Jharkhand\'s mining districts, developing monitoring protocols and mitigation strategies for protecting roads, buildings, and water resources. His work combines traditional geotechnical engineering with modern monitoring technologies including InSAR satellite data and drone-based surveys. At the conference, he will present on assessing and mitigating geotechnical risks in mining-affected infrastructure.',
      session: {
        title: 'Geotechnical Risk Assessment and Mitigation for Infrastructure in Mining-Affected Areas',
        description: 'This technical presentation will cover methodologies for assessing ground stability, predicting subsidence, and designing resilient infrastructure in regions impacted by underground and surface mining. Case studies from Jharkhand will illustrate practical solutions.',
        date: 'Day 2',
        time: '02:00 PM - 03:00 PM',
        venue: 'Seminar Hall 2'
      },
      topic: 'Sustainable Development',
      date: 'Day 2',
      format: 'Keynote'
    }
  ],

  industryLeaders: [
    {
      id: 'cmd-ccl',
      name: 'Shri Nilendu Kumar Singh',
      title: 'Chairman-cum-Managing Director',
      role: 'Industry Leader',
      designation: 'CMD',
      institution: 'Central Coalfields Limited (CCL)',
      photo: null,
      teaser: 'Leading India\'s largest coal producer with focus on modernizing mining operations and implementing safety technologies.',
      bio: 'Shri Nilendu Kumar Singh serves as the Chairman-cum-Managing Director of Central Coalfields Limited (CCL), a subsidiary of Coal India Limited and one of the largest coal-producing companies in the world. Under his leadership, CCL has initiated significant modernization programs including the deployment of advanced mining equipment, implementation of real-time safety monitoring systems, and adoption of environmental management practices. As CMD, he oversees operations across Jharkhand\'s major coalfields, employing thousands of workers and contributing significantly to India\'s energy security. His commitment to integrating technology with traditional mining practices aligns with the conference\'s theme of advancing mining safety through innovation.',
      session: null,
      topic: 'Industry',
      date: 'Day 1',
      format: 'VVIP'
    },
    {
      id: 'cmd-bccl',
      name: 'Shri Manoj Kumar Agarwal',
      title: 'Chairman-cum-Managing Director',
      role: 'Industry Leader',
      designation: 'CMD',
      institution: 'Bharat Coking Coal Limited (BCCL)',
      photo: null,
      teaser: 'Spearheading underground mining safety initiatives and technological upgrades in one of India\'s oldest coal mining companies.',
      bio: 'Shri Manoj Kumar Agarwal is the Chairman-cum-Managing Director of Bharat Coking Coal Limited (BCCL), a premier underground coal mining company operating in the Jharia and Raniganj coalfields. With decades of experience in coal mining operations, he has been instrumental in driving safety improvements, technological modernization, and environmental stewardship at BCCL. His leadership has focused on addressing the unique challenges of deep underground mining, including fire management, ground control, and worker safety in geologically complex conditions. At NYSC-2026, his presence represents the critical partnership between industry and academia in advancing mining safety research.',
      session: null,
      topic: 'Industry',
      date: 'Day 1',
      format: 'VVIP'
    },
    {
      id: 'cmd-cmpdi',
      name: 'Shri Chaudhari Shivraj Singh',
      title: 'Chairman-cum-Managing Director',
      role: 'Industry Leader',
      designation: 'CMD',
      institution: 'Central Mine Planning & Design Institute (CMPDI)',
      photo: null,
      teaser: 'Leading India\'s premier mining consultancy in mine planning, design innovation, and sustainable extraction methodologies.',
      bio: 'Shri Chaudhari Shivraj Singh serves as CMD of Central Mine Planning & Design Institute (CMPDI), the premier mining consultancy organization in India responsible for mine planning, design, and technical services for the coal sector. CMPDI plays a crucial role in ensuring that mining operations are planned scientifically, with due consideration for safety, efficiency, and environmental impact. Under his guidance, CMPDI has been at the forefront of adopting advanced technologies including computer-aided mine design, GIS-based planning tools, and sustainable mining practices. His expertise in mine planning and design makes him a key stakeholder in translating research findings into operational practices.',
      session: null,
      topic: 'Industry',
      date: 'Day 1',
      format: 'VVIP'
    }
  ],

  researchDelegates: [
    {
      id: 'dir-cimfr',
      name: 'Prof. Arvind Kumar Mishra',
      title: 'Director',
      role: 'Research Delegate',
      designation: 'Director',
      institution: 'CSIR-Central Institute of Mining and Fuel Research (CIMFR), Dhanbad',
      photo: null,
      teaser: 'Heading India\'s premier mining research institution, driving innovation in mining technology, fuel research, and safety science.',
      bio: 'Prof. Arvind Kumar Mishra is the Director of CSIR-Central Institute of Mining and Fuel Research (CIMFR), Dhanbad, India\'s leading research institution focused on mining technology, fuel research, and related safety sciences. Under his leadership, CIMFR conducts cutting-edge research on mine safety, environmental management, clean coal technologies, and mining equipment development. The institute works closely with industry, academia, and government to translate research into practical solutions for the mining and energy sectors. Prof. Mishra\'s vision for CIMFR emphasizes interdisciplinary research, international collaboration, and capacity building in mining safety and sustainability.',
      session: null,
      topic: 'Research',
      date: 'Day 1',
      format: 'Research Delegate'
    },
    {
      id: 'dir-jsac',
      name: 'Ms. Madhvi Mishra (IAS)',
      title: 'Director, Executive Directorate',
      role: 'Research Delegate',
      designation: 'Director',
      institution: 'Jharkhand Space Applications Center (JSAC)',
      photo: null,
      teaser: 'Leading Jharkhand\'s state space applications center in leveraging satellite technology for governance and development.',
      bio: 'Ms. Madhvi Mishra (IAS) serves as Director of the Executive Directorate at Jharkhand Space Applications Center (JSAC), the state government\'s nodal agency for coordinating space technology applications for governance and development. JSAC plays a vital role in utilizing satellite data and geospatial technologies for natural resource management, disaster monitoring, urban planning, and rural development in Jharkhand. Under her leadership, JSAC has strengthened collaboration with ISRO and other space agencies to develop operational applications addressing the state\'s unique challenges in mining monitoring, forest management, and infrastructure planning.',
      session: null,
      topic: 'Research',
      date: 'Day 1',
      format: 'Research Delegate'
    }
  ],

  sessionChairs: [
    {
      id: 'vc-jut',
      name: 'Dr. Dharmendra Kumar Singh',
      title: 'Hon\'ble Vice-Chancellor',
      role: 'Session Chair',
      designation: 'Vice-Chancellor',
      institution: 'Jharkhand University of Technology (JUT), Ranchi',
      photo: null,
      teaser: 'Academic leader fostering technological education and research collaboration across Jharkhand\'s technical institutions.',
      bio: 'Dr. Dharmendra Kumar Singh serves as the Vice-Chancellor of Jharkhand University of Technology (JUT), Ranchi, a state university established to promote technical education and research in Jharkhand. As VC, he has been instrumental in developing industry-academia partnerships, promoting research in areas relevant to the state\'s industrial base, and enhancing the quality of technical education. His leadership has facilitated collaboration between JUT and partner institutions for the conference, strengthening the academic foundation of NYSC-2026.',
      session: {
        title: 'Session Chair - Opening Technical Sessions',
        description: 'Will chair the opening technical sessions on Day 1, moderating discussions between speakers and audience.',
        date: 'Day 1',
        time: 'Various sessions',
        venue: 'Main Auditorium'
      },
      topic: 'Moderator',
      date: 'Day 1',
      format: 'Session Chair'
    }
  ]
};

// Filter options
export const filterOptions = {
  topics: ['All', 'Mining Safety', 'Remote Sensing', 'Sustainable Development', 'Industry', 'Research', 'Governance', 'Moderator'],
  dates: ['All', 'Day 1', 'Day 2'],
  formats: ['All', 'Keynote', 'VVIP', 'Research Delegate', 'Session Chair', 'Inaugural']
};

export default speakersData;
