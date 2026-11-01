// Content for 200 to 400 level (and the extra years of 5 and 6 year degrees, which reuse the 400 level lists).
//
// TITLES[dept][level][term - 1] = four course titles. Codes are generated from the department prefix, level and term.
// UPPER_QUESTIONS['dept@level'] = question bank, same format as questions.js: [question, right, wrong, wrong, wrong].
// Everything is university-level general knowledge. Have a lecturer or senior student review before launch.

export const TITLES = {
  cs: {
    2: [['Data Structures I', 'Discrete Mathematics', 'Computer Architecture', 'Technical Writing'], ['Data Structures II', 'Object-Oriented Programming', 'Operating Systems I', 'Numerical Methods']],
    3: [['Algorithms and Complexity', 'Database Systems', 'Software Engineering I', 'Computer Networks'], ['Operating Systems II', 'Web Technologies', 'Artificial Intelligence', 'Compiler Construction']],
    4: [['Final Year Project I', 'Computer Security', 'Machine Learning', 'Distributed Systems'], ['Final Year Project II', 'Mobile Application Development', 'Human-Computer Interaction', 'Entrepreneurship for Computing']]
  },
  medicine: {
    2: [['Human Anatomy I', 'Physiology I', 'Biochemistry I', 'Medical Sociology'], ['Human Anatomy II', 'Physiology II', 'Biochemistry II', 'Medical Ethics']],
    3: [['Pathology I', 'Pharmacology I', 'Microbiology I', 'Community Health'], ['Pathology II', 'Pharmacology II', 'Microbiology II', 'Medical Statistics']],
    4: [['Internal Medicine I', 'Surgery I', 'Paediatrics I', 'Clinical Skills I'], ['Internal Medicine II', 'Surgery II', 'Obstetrics and Gynaecology', 'Clinical Skills II']]
  },
  law: {
    2: [['Law of Contract II', 'Law of Torts I', 'Criminal Law I', 'Constitutional Law II'], ['Law of Torts II', 'Criminal Law II', 'Land Law I', 'Legal Writing']],
    3: [['Equity and Trusts I', 'Company Law I', 'Law of Evidence I', 'Administrative Law'], ['Equity and Trusts II', 'Company Law II', 'Law of Evidence II', 'Jurisprudence']],
    4: [['Civil Procedure', 'Criminal Procedure', 'Conflict of Laws', 'Law of Succession'], ['Commercial Law', 'Labour Law', 'International Law I', 'Legal Practice Skills']]
  },
  engineering: {
    2: [['Engineering Mathematics I', 'Thermodynamics', 'Engineering Mechanics', 'Programming for Engineers'], ['Engineering Mathematics II', 'Strength of Materials', 'Circuit Theory', 'Workshop Practice']],
    3: [['Fluid Mechanics', 'Electrical Machines', 'Engineering Materials', 'Numerical Analysis'], ['Control Systems', 'Heat Transfer', 'Engineering Economics', 'Technical Report Writing']],
    4: [['Design of Machines', 'Engineering Management', 'Instrumentation', 'Project Planning'], ['Industrial Training Report', 'Renewable Energy Systems', 'Engineering Project I', 'Safety Engineering']]
  },
  accounting: {
    2: [['Financial Accounting I', 'Cost Accounting I', 'Business Law', 'Business Statistics'], ['Financial Accounting II', 'Cost Accounting II', 'Taxation I', 'Management Principles']],
    3: [['Intermediate Financial Reporting', 'Management Accounting', 'Auditing I', 'Corporate Law'], ['Advanced Financial Reporting', 'Taxation II', 'Auditing II', 'Public Sector Accounting']],
    4: [['Advanced Auditing', 'Strategic Management Accounting', 'Financial Management', 'Accounting Theory'], ['Forensic Accounting', 'Accounting Research Project', 'Banking and Finance', 'Professional Ethics']]
  },
  masscomm: {
    2: [['News Writing and Reporting', 'Radio Production I', 'Communication Theory', 'Photojournalism'], ['Feature Writing', 'Television Production I', 'Media Law and Ethics', 'Public Relations I']],
    3: [['Investigative Journalism', 'Advertising Principles', 'Media Research Methods', 'Broadcast News'], ['Public Relations II', 'Digital Media', 'Development Communication', 'Editing and Layout']],
    4: [['Media Management', 'International Communication', 'Communication Research Project I', 'Political Communication'], ['Documentary Production', 'Media Economics', 'Communication Research Project II', 'Media Entrepreneurship']]
  },
  pharmacy: {
    2: [['Pharmaceutical Organic Chemistry', 'Human Physiology', 'Pharmaceutical Microbiology', 'Pharmacognosy I'], ['Pharmaceutical Biochemistry', 'Pharmaceutical Analysis I', 'Pharmacognosy II', 'Pharmaceutics I']],
    3: [['Pharmacology I', 'Pharmaceutics II', 'Medicinal Chemistry', 'Pharmaceutical Technology'], ['Pharmacology II', 'Pharmaceutical Analysis II', 'Clinical Pharmacy I', 'Pharmacy Law and Ethics']],
    4: [['Clinical Pharmacy II', 'Toxicology', 'Biopharmaceutics', 'Pharmacoepidemiology'], ['Hospital Pharmacy', 'Drug Formulation', 'Pharmaceutical Marketing', 'Pharmacy Research Project I']]
  },
  economics: {
    2: [['Microeconomics I', 'Macroeconomics I', 'Mathematics for Economists', 'Economic History of Nigeria'], ['Microeconomics II', 'Macroeconomics II', 'Statistics for Economists II', 'Public Finance']],
    3: [['Econometrics I', 'International Trade', 'Development Economics', 'Monetary Economics'], ['Econometrics II', 'Labour Economics', 'Industrial Economics', 'Economic Planning']],
    4: [['Economics Research Project I', 'Advanced Microeconomic Theory', 'Petroleum Economics', 'Money and Banking'], ['Economics Research Project II', 'Advanced Macroeconomic Theory', 'Economic Policy Analysis', 'Entrepreneurship Economics']]
  },
  maths: {
    2: [['Calculus III', 'Linear Algebra II', 'Real Analysis I', 'Mathematical Methods I'], ['Differential Equations I', 'Abstract Algebra I', 'Probability I', 'Complex Analysis I']],
    3: [['Real Analysis II', 'Numerical Analysis I', 'Mechanics I', 'Differential Equations II'], ['Abstract Algebra II', 'Mathematical Statistics', 'Topology I', 'Operations Research']],
    4: [['Functional Analysis', 'Mathematics Project I', 'Partial Differential Equations', 'Number Theory'], ['Mathematics Project II', 'Mathematical Modelling', 'Differential Geometry', 'Graph Theory']]
  }
};

export const UPPER_QUESTIONS = {
  'cs@2': [
    ['A stack follows which ordering?', 'Last in, first out', 'First in, first out', 'Random access', 'Sorted order'],
    ['Which data structure uses first in, first out ordering?', 'Queue', 'Stack', 'Tree', 'Graph'],
    ['The binary form of decimal 5 is…', '101', '110', '011', '111'],
    ['A binary search needs the list to be…', 'Sorted', 'Reversed', 'Empty', 'Unique in length'],
    ['Which logic gate outputs 1 only when both inputs are 1?', 'AND', 'OR', 'XOR', 'NOT'],
    ['The time complexity of reading an array element by index is…', 'O(1)', 'O(n)', 'O(log n)', 'O(n²)'],
    ['Which of these is an object-oriented language?', 'Java', 'HTML', 'SQL', 'CSS'],
    ['The CPU component that does arithmetic is the…', 'ALU', 'RAM', 'BIOS', 'Hard disk']
  ],
  'cs@3': [
    ['SQL stands for…', 'Structured Query Language', 'Simple Question Logic', 'Sequential Query Layer', 'Stored Query List'],
    ['A primary key…', 'Uniquely identifies each row', 'Repeats in a table', 'Encrypts data', 'Deletes rows'],
    ['TCP is a…', 'Connection-oriented protocol', 'Wireless standard', 'Programming language', 'Database engine'],
    ['The worst case time of bubble sort is…', 'O(n²)', 'O(n)', 'O(log n)', 'O(1)'],
    ['Which OSI layer handles routing?', 'Network layer', 'Physical layer', 'Session layer', 'Application layer'],
    ['An IPv4 address has how many bits?', '32', '64', '128', '16'],
    ['Translating source code to machine code is done by a…', 'Compiler', 'Browser', 'Router', 'Debugger'],
    ['Which of these is NOT a phase of software development?', 'Mining', 'Design', 'Testing', 'Maintenance']
  ],
  'cs@4': [
    ['Overfitting in machine learning means the model…', 'Memorises training data and generalises poorly', 'Is too simple', 'Has no data', 'Trains too fast'],
    ['Which attack tricks users into giving away passwords through fake messages?', 'Phishing', 'Firewalling', 'Hashing', 'Caching'],
    ['A hash function is commonly used to…', 'Map data to a fixed-size value', 'Compress video', 'Draw graphs', 'Sort lists'],
    ['HTTPS uses which protocol for encryption?', 'TLS', 'FTP', 'SMTP', 'ARP'],
    ['In supervised learning the training data is…', 'Labelled', 'Unlabelled', 'Random noise', 'Encrypted'],
    ['A distributed system consists of…', 'Several computers working together', 'A single computer', 'Only one network cable', 'One database table'],
    ['Agile development favours…', 'Short iterations with feedback', 'One long delivery', 'No customer contact', 'No testing'],
    ['Which of these is a mobile operating system?', 'Android', 'Oracle', 'Excel', 'Photoshop']
  ],

  'medicine@2': [
    ['The largest bone in the human body is the…', 'Femur', 'Humerus', 'Tibia', 'Sternum'],
    ['Which organ filters blood to make urine?', 'Kidney', 'Liver', 'Spleen', 'Pancreas'],
    ['The enzyme in saliva that digests starch is…', 'Amylase', 'Pepsin', 'Lipase', 'Trypsin'],
    ['A normal adult resting heart rate is about…', '60 to 100 beats per minute', '20 to 40 beats per minute', '120 to 160 beats per minute', '200 beats per minute'],
    ['The main positive ion outside cells is…', 'Sodium', 'Potassium', 'Iron', 'Magnesium'],
    ['Insulin lowers…', 'Blood glucose', 'Blood pressure', 'Body temperature', 'Heart rate'],
    ['The cranial nerve responsible for vision is the…', 'Optic nerve', 'Vagus nerve', 'Facial nerve', 'Olfactory nerve'],
    ['Deficiency of which vitamin causes scurvy?', 'Vitamin C', 'Vitamin A', 'Vitamin D', 'Vitamin B1']
  ],
  'medicine@3': [
    ['Which mosquito transmits malaria?', 'Female Anopheles', 'Male Culex', 'Female Aedes', 'Tsetse fly'],
    ['Penicillin works by…', 'Blocking bacterial cell wall synthesis', 'Blocking viral entry', 'Killing fungi', 'Raising body temperature'],
    ['The classic signs of inflammation are redness, swelling, heat and…', 'Pain', 'Itching', 'Cough', 'Numbness'],
    ['Which organism causes tuberculosis?', 'Mycobacterium tuberculosis', 'Plasmodium falciparum', 'Vibrio cholerae', 'Salmonella typhi'],
    ['Paracetamol is mainly used as…', 'A pain reliever and fever reducer', 'An antibiotic', 'A blood thinner', 'A diuretic'],
    ['The study of disease patterns in populations is…', 'Epidemiology', 'Anatomy', 'Histology', 'Embryology'],
    ['Typhoid fever is caused by…', 'Salmonella typhi', 'Plasmodium', 'Vibrio cholerae', 'Staphylococcus aureus'],
    ['A 95% confidence interval is…', 'A range likely to contain the true value', 'The exact mean', 'The sample size', 'The p-value']
  ],
  'medicine@4': [
    ['A normal adult blood pressure is about…', '120/80 mmHg', '200/150 mmHg', '60/40 mmHg', '90/180 mmHg'],
    ['Appendicitis typically causes pain in the…', 'Right lower abdomen', 'Left upper abdomen', 'Chest', 'Left knee'],
    ['A Caesarean section is delivery through…', 'An abdominal incision', 'The vaginal route only', 'Forceps only', 'Suction only'],
    ['The Glasgow Coma Scale assesses…', 'Level of consciousness', 'Blood sugar', 'Kidney function', 'Hearing'],
    ['Which drug class lowers blood pressure by blocking ACE?', 'ACE inhibitors', 'Antihistamines', 'Opioids', 'Statins'],
    ['The first step in the ABC of resuscitation is…', 'Airway', 'Bleeding', 'Cough', 'Dressing'],
    ['Vaccination provides…', 'Active immunity', 'Passive immunity only', 'No immunity', 'An instant cure'],
    ['Hypoglycaemia means low…', 'Blood sugar', 'Blood pressure', 'Body temperature', 'Oxygen']
  ],

  'law@2': [
    ['In contract law, an offer must be…', 'Communicated to the offeree', 'Kept secret', 'Written only', 'Made by a court'],
    ['Consideration in a contract means…', 'Something of value exchanged', 'A court order', 'A written apology', 'A government licence'],
    ['The tort of negligence requires duty, breach and…', 'Damage', 'Intention', 'Witnesses', 'A written contract'],
    ['"Volenti non fit injuria" means…', 'No injury to a willing person', 'Truth is a defence', 'The thing speaks for itself', 'Let the buyer beware'],
    ['Murder under Nigerian criminal law requires…', 'Intention to cause death or grievous harm', 'Only accidental death', 'Property damage', 'Theft'],
    ['Chapter IV of the 1999 Constitution deals with…', 'Fundamental rights', 'Taxation', 'Local councils', 'Elections'],
    ['The tort of defamation protects a person\'s…', 'Reputation', 'Land', 'Contract', 'Copyright'],
    ['A void contract is…', 'Without legal effect from the start', 'Fully enforceable', 'Only oral', 'Signed by minors only']
  ],
  'law@3': [
    ['Equity developed mainly in the Court of…', 'Chancery', 'Appeal', 'Assizes', 'Magistrates'],
    ['A trust involves a settlor, a trustee and a…', 'Beneficiary', 'Debtor', 'Plaintiff', 'Auditor'],
    ['Company law gives a registered company…', 'Separate legal personality', 'No legal rights', 'A fixed lifespan', 'Only its owners\' liability'],
    ['The case Salomon v Salomon established…', 'Separate corporate personality', 'Duty of care', 'Offer and acceptance', 'Strict liability'],
    ['Hearsay evidence is generally…', 'Inadmissible', 'Always preferred', 'Required', 'Written only'],
    ['The standard of proof in criminal cases is…', 'Beyond reasonable doubt', 'Balance of probabilities', 'Possible doubt', 'Any suspicion'],
    ['Judicial review examines whether a public body acted…', 'Lawfully', 'Quickly', 'Cheaply', 'Publicly'],
    ['Jurisprudence is the study of…', 'The philosophy of law', 'Taxes', 'Medicine', 'Contracts only']
  ],
  'law@4': [
    ['A writ of summons starts a…', 'Civil action', 'Criminal arrest', 'Marriage', 'Tax audit'],
    ['Criminal procedure rules govern…', 'How criminal trials are conducted', 'Company mergers', 'Land titles', 'Marriages'],
    ['Conflict of laws deals with…', 'Cases involving more than one legal system', 'Wars between states', 'Road traffic', 'Tax fraud'],
    ['A person who dies without a valid will dies…', 'Intestate', 'Testate', 'Insolvent', 'Absent'],
    ['A contract of employment is governed by…', 'Labour law', 'Land law', 'Maritime law', 'Tax law'],
    ['Arbitration is a way of…', 'Settling disputes outside the court', 'Passing laws', 'Arresting suspects', 'Registering companies'],
    ['The International Court of Justice sits in…', 'The Hague', 'Geneva', 'Lagos', 'Abuja'],
    ['A lawyer must act with…', 'Honesty and professional ethics', 'Secrecy from the court', 'Bias for the client always', 'No preparation']
  ],

  'engineering@2': [
    ['Newton\'s second law states that force equals…', 'Mass times acceleration', 'Mass divided by velocity', 'Speed times time', 'Pressure times area'],
    ['The SI unit of energy is the…', 'Joule', 'Watt', 'Newton', 'Pascal'],
    ['Ohm\'s law is…', 'V = IR', 'P = mv', 'F = ma', 'E = mc²'],
    ['The first law of thermodynamics concerns…', 'Conservation of energy', 'Entropy always falling', 'Absolute zero', 'Heat flow only'],
    ['Stress is force divided by…', 'Area', 'Time', 'Volume', 'Mass'],
    ['The derivative of x² is…', '2x', 'x', 'x²', '2'],
    ['Resistors in series add up to…', 'The sum of their resistances', 'The product', 'The smallest value', 'Zero'],
    ['The SI unit of power is the…', 'Watt', 'Joule', 'Volt', 'Ampere']
  ],
  'engineering@3': [
    ['Bernoulli\'s principle relates fluid speed and…', 'Pressure', 'Colour', 'Mass only', 'Charge'],
    ['Which material property is resistance to deformation?', 'Stiffness', 'Density', 'Conductivity', 'Colour'],
    ['A transformer changes…', 'AC voltage levels', 'DC into light', 'Mass into energy', 'Water pressure only'],
    ['In a feedback control system the output is…', 'Compared with the desired input', 'Ignored', 'Stored in a battery', 'Always zero'],
    ['Heat transfer by direct contact is…', 'Conduction', 'Convection', 'Radiation', 'Evaporation'],
    ['Young\'s modulus measures…', 'Stiffness of a material', 'Electric charge', 'Fluid viscosity', 'Sound speed'],
    ['Which of these is a renewable energy source?', 'Solar', 'Coal', 'Diesel', 'Natural gas'],
    ['The unit of electrical resistance is the…', 'Ohm', 'Farad', 'Henry', 'Tesla']
  ],
  'engineering@4': [
    ['A safety factor is the ratio of…', 'Failure load to working load', 'Cost to profit', 'Speed to power', 'Mass to volume'],
    ['An instrument that measures electric current is an…', 'Ammeter', 'Voltmeter', 'Barometer', 'Anemometer'],
    ['A Gantt chart is used for…', 'Project scheduling', 'Circuit design', 'Fluid flow', 'Stress testing'],
    ['Which protective equipment guards the head on a site?', 'A hard hat', 'Gloves', 'Boots', 'Goggles'],
    ['Engineering management involves planning, organising and…', 'Controlling resources', 'Ignoring risk', 'Skipping tests', 'Only drawing'],
    ['The efficiency of a machine is output divided by…', 'Input', 'Time', 'Weight', 'Voltage'],
    ['Photovoltaic cells convert sunlight into…', 'Electricity', 'Heat only', 'Sound', 'Wind'],
    ['The fire triangle needs heat, fuel and…', 'Oxygen', 'Water', 'Smoke', 'Carbon dioxide']
  ],

  'accounting@2': [
    ['The accounting equation is…', 'Assets = Liabilities + Equity', 'Assets = Income − Expenses', 'Equity = Assets + Liabilities', 'Profit = Cash'],
    ['A debit entry increases…', 'Assets', 'Liabilities', 'Equity always', 'Revenue'],
    ['Fixed costs…', 'Do not change with output', 'Rise with each unit', 'Are always zero', 'Equal revenue'],
    ['A balance sheet shows…', 'Assets, liabilities and equity at a date', 'Profit over a year', 'Cash flows only', 'Sales forecasts'],
    ['The mean of 2, 4 and 6 is…', '4', '6', '3', '12'],
    ['Value Added Tax in Nigeria is charged at…', '7.5%', '15%', '2%', '20%'],
    ['Depreciation spreads the cost of an asset over its…', 'Useful life', 'Purchase date', 'Resale only', 'Tax year only'],
    ['A valid contract needs offer, acceptance and…', 'Consideration', 'A witness', 'A receipt', 'An invoice']
  ],
  'accounting@3': [
    ['An auditor\'s main duty is to…', 'Give an opinion on the financial statements', 'Prepare the budget', 'Sell products', 'Hire staff'],
    ['Variable costs change with…', 'Output level', 'Rent', 'Time only', 'Interest rates only'],
    ['Goodwill is an…', 'Intangible asset', 'Liability', 'Expense', 'Tax'],
    ['An audit trail is…', 'A record that can be followed back to its source', 'A tax refund', 'A loan', 'A budget'],
    ['Marginal costing treats fixed costs as…', 'Period costs', 'Product costs', 'Revenue', 'Liabilities'],
    ['IFRS stands for…', 'International Financial Reporting Standards', 'Internal Fiscal Report System', 'International Fund Revenue Scheme', 'Integrated Financial Ratio Standard'],
    ['Public sector accounting is mostly concerned with…', 'Accountability for public funds', 'Maximising profit', 'Stock trading', 'Private loans'],
    ['Company income tax is charged on a company\'s…', 'Taxable profits', 'Total revenue only', 'Number of staff', 'Shares issued']
  ],
  'accounting@4': [
    ['Forensic accounting investigates…', 'Fraud and financial irregularities', 'Weather patterns', 'Sports results', 'Road safety'],
    ['The current ratio is current assets divided by…', 'Current liabilities', 'Total equity', 'Revenue', 'Fixed assets'],
    ['A budget is a…', 'Financial plan', 'Past report', 'Tax return', 'Share certificate'],
    ['The time value of money means…', 'Money now is worth more than the same money later', 'Money never changes value', 'Interest is illegal', 'Inflation is zero'],
    ['Professional ethics requires an accountant to be…', 'Independent and honest', 'Loyal to any client', 'Secretive about errors', 'Paid in advance'],
    ['A bank that holds deposits and gives loans is a…', 'Commercial bank', 'Central bank', 'Stock exchange', 'Insurance firm'],
    ['Return on investment measures…', 'Profit relative to cost', 'Total staff', 'Market share only', 'Tax paid'],
    ['The Central Bank of Nigeria is responsible for…', 'Monetary policy', 'Collecting income tax', 'Running courts', 'Building roads']
  ],

  'masscomm@2': [
    ['The "inverted pyramid" style puts the…', 'Most important facts first', 'Least important facts first', 'Opinions first', 'Adverts first'],
    ['The five Ws of news are Who, What, When, Where and…', 'Why', 'Which', 'Whose', 'Whether'],
    ['In radio, the person who presents a programme is the…', 'Presenter', 'Editor', 'Printer', 'Cameraman'],
    ['Libel is…', 'Written defamation', 'Spoken defamation', 'A radio format', 'A camera shot'],
    ['Public relations aims to build…', 'Goodwill with the public', 'Taxes', 'Roads', 'Software'],
    ['A shot showing a whole scene is a…', 'Wide shot', 'Close-up', 'Cut-away', 'Insert'],
    ['A feature article differs from a news report because it is…', 'More in-depth and descriptive', 'Shorter and unsigned', 'Only about sport', 'Always an advert'],
    ['Iwe Irohin, the first Nigerian newspaper, began in…', '1859', '1960', '1900', '1999']
  ],
  'masscomm@3': [
    ['Investigative journalism involves…', 'In-depth research to uncover hidden facts', 'Rewriting press releases', 'Only live reports', 'Social media posting'],
    ['An advert aims to…', 'Persuade people to buy or act', 'Report news neutrally', 'Edit videos', 'Print newspapers'],
    ['A survey is a method of…', 'Collecting data from a sample', 'Printing news', 'Editing sound', 'Selling space'],
    ['A sample is…', 'A part chosen from a larger population', 'The whole population', 'A questionnaire', 'A headline'],
    ['Digital media includes…', 'Websites and social media', 'Only newspapers', 'Only radio', 'Only posters'],
    ['Development communication focuses on…', 'Social and economic progress', 'Entertainment only', 'Sports', 'Fashion'],
    ['A headline is…', 'The title of a story', 'The author\'s note', 'A photograph credit', 'The final paragraph'],
    ['Layout in a newspaper refers to…', 'The arrangement of text and images on pages', 'The cost of paper', 'The delivery route', 'The staff list']
  ],
  'masscomm@4': [
    ['Concentrated media ownership can reduce…', 'Diversity of views', 'Rainfall', 'Road quality', 'Exchange rates only'],
    ['A documentary is a…', 'Non-fiction film', 'Fictional drama', 'Cartoon only', 'Sports commentary'],
    ['A press release is written by…', 'An organisation to inform the media', 'The audience', 'A printer', 'A court'],
    ['Political communication includes…', 'Campaign messages and debates', 'Cooking shows', 'Sports scores', 'Weather charts'],
    ['Media entrepreneurship means…', 'Starting and running a media business', 'Reading the news', 'Printing only', 'Editing only'],
    ['International communication involves…', 'Information flows across countries', 'Local weather only', 'School timetables', 'Road signs'],
    ['Which is a main source of income for a TV station?', 'Advertising', 'Rainfall', 'Tax refunds only', 'Gifts only'],
    ['A research hypothesis is…', 'A testable statement', 'A final result', 'A headline', 'An advert']
  ],

  'pharmacy@2': [
    ['Organic chemistry studies compounds of…', 'Carbon', 'Iron only', 'Helium', 'Sodium only'],
    ['The study of drugs from plants is…', 'Pharmacognosy', 'Pharmaceutics', 'Toxicology', 'Histology'],
    ['Which of these organisms is a bacterium?', 'Escherichia coli', 'Candida albicans', 'Influenza virus', 'Plasmodium'],
    ['Pharmaceutics deals with…', 'Formulating drugs into dosage forms', 'Heart surgery', 'Plant breeding', 'Bridge design'],
    ['The pH scale measures…', 'Acidity or alkalinity', 'Temperature', 'Pressure', 'Weight'],
    ['A tablet is a…', 'Solid dosage form', 'Liquid dosage form', 'Gas', 'Plant fibre'],
    ['Enzymes are biological…', 'Catalysts', 'Fuels', 'Vitamins only', 'Hormones only'],
    ['Which vitamin dissolves in fat?', 'Vitamin A', 'Vitamin C', 'Vitamin B2', 'Vitamin B12']
  ],
  'pharmacy@3': [
    ['Antibiotics are used against…', 'Bacterial infections', 'Viral infections only', 'Fractures', 'Allergies only'],
    ['Pharmacology is the study of…', 'How drugs act on the body', 'Plant growth', 'Building design', 'Soil types'],
    ['A drug\'s half-life is the time for its concentration to…', 'Fall by half', 'Double', 'Stay constant', 'Reach zero instantly'],
    ['The oral route of administration means…', 'By mouth', 'Into a vein', 'Under the tongue only', 'Onto the skin'],
    ['Pharmacy law regulates…', 'The sale and supply of medicines', 'Football rules', 'Road tax', 'Building permits'],
    ['Which agency regulates food and drugs in Nigeria?', 'NAFDAC', 'WAEC', 'NNPC', 'JAMB'],
    ['Clinical pharmacy focuses on…', 'Safe and effective use of medicines by patients', 'Making furniture', 'Drug packaging art only', 'Farming'],
    ['Titration is used to find…', 'The concentration of a solution', 'The colour of a drug', 'The weight of a person', 'The age of a plant']
  ],
  'pharmacy@4': [
    ['Toxicology studies…', 'Harmful effects of substances', 'Plant growth', 'Bone structure', 'Sound waves'],
    ['Bioavailability is the fraction of a dose that…', 'Reaches the bloodstream', 'Is swallowed', 'Is manufactured', 'Is sold'],
    ['A hospital pharmacist helps to…', 'Ensure correct dispensing and advise on medicines', 'Perform surgery', 'Drive ambulances', 'Print newspapers'],
    ['An adverse drug reaction is…', 'An unwanted harmful effect of a medicine', 'A discount', 'A prescription pad', 'A dose'],
    ['A placebo is…', 'A substance with no active drug', 'A strong antibiotic', 'A vaccine only', 'A poison'],
    ['Counterfeit drugs are…', 'Fake medicines', 'Cheaper brands', 'Expired labels only', 'Herbal teas'],
    ['Drug formulation includes choosing…', 'The active ingredient and excipients', 'The patient\'s name', 'The shop colour', 'Transport routes'],
    ['Pharmacoepidemiology studies drug use in…', 'Populations', 'Single molecules', 'Plants', 'Buildings']
  ],

  'economics@2': [
    ['The law of demand says that as price rises, quantity demanded…', 'Falls', 'Rises', 'Stays constant', 'Doubles'],
    ['GDP stands for…', 'Gross Domestic Product', 'General Domestic Price', 'Gross Development Plan', 'Government Debt Percentage'],
    ['Inflation is a general rise in…', 'Prices', 'Wages only', 'Exports', 'Unemployment'],
    ['Opportunity cost is…', 'The value of the next best alternative', 'The price paid', 'Total profit', 'Tax on income'],
    ['A monopoly is a market with…', 'One seller', 'Many sellers', 'No buyers', 'Free goods'],
    ['Public finance deals with…', 'Government taxation and spending', 'Private loans only', 'Stock trading only', 'Charity work'],
    ['The median of 1, 3 and 5 is…', '3', '5', '1', '9'],
    ['Elasticity measures…', 'How responsive demand or supply is to change', 'Price only', 'Profit', 'Population']
  ],
  'economics@3': [
    ['Econometrics uses statistics to…', 'Test economic relationships', 'Print money', 'Build roads', 'Sell goods'],
    ['Comparative advantage means producing at a lower…', 'Opportunity cost', 'Quality', 'Wage', 'Distance'],
    ['Which of these is a measure of development?', 'Human Development Index', 'Rainfall index', 'Football ranking', 'Traffic index'],
    ['When a central bank raises interest rates, borrowing tends to…', 'Fall', 'Rise', 'Double', 'Stay fixed'],
    ['Unemployment of people who are between jobs is…', 'Frictional', 'Structural', 'Cyclical', 'Seasonal only'],
    ['Which commodity dominates Nigeria\'s exports?', 'Crude oil', 'Cocoa only', 'Textiles', 'Cars'],
    ['A tariff is a…', 'Tax on imports', 'Subsidy', 'Wage', 'Loan'],
    ['Economic planning means…', 'Setting goals and policies for the economy', 'Printing money', 'Random spending', 'Ignoring markets']
  ],
  'economics@4': [
    ['A subsidy is…', 'A government payment that lowers prices', 'A tax on exports', 'Interest on loans', 'A fine'],
    ['The exchange rate is the price of…', 'One currency in terms of another', 'Oil', 'Labour', 'Land'],
    ['Fiscal policy uses…', 'Government spending and taxes', 'Interest rates only', 'Currency design', 'Trade treaties only'],
    ['A recession is a period of…', 'Falling economic activity', 'Rapid growth', 'Zero prices', 'No taxes'],
    ['Petroleum economics studies…', 'Oil and gas markets and policy', 'Farming', 'Fashion', 'Football'],
    ['Money serves as a medium of exchange and a…', 'Store of value', 'Source of fuel', 'Type of food', 'Law'],
    ['Cost-benefit analysis compares…', 'The gains and losses of a decision', 'Two currencies', 'Two cities', 'Two taxes'],
    ['A budget deficit occurs when spending is…', 'Greater than revenue', 'Less than revenue', 'Equal to savings', 'Zero']
  ],

  'maths@2': [
    ['The derivative of sin x is…', 'cos x', '−cos x', 'sin x', 'tan x'],
    ['The integral of 2x is…', 'x² + C', '2 + C', 'x + C', '2x² + C'],
    ['A matrix with equal numbers of rows and columns is…', 'Square', 'Diagonal', 'Zero', 'A row matrix'],
    ['A sequence converges if it…', 'Approaches a limit', 'Grows without bound', 'Alternates forever', 'Is empty'],
    ['The probability of a certain event is…', '1', '0', '0.5', '2'],
    ['Every group must contain an…', 'Identity element', 'Zero divisor', 'Infinite set', 'Random element'],
    ['The square root of −1 is denoted…', 'i', 'e', 'π', '0'],
    ['A first-order differential equation involves the…', 'First derivative', 'Third derivative', 'No derivative', 'Fourth derivative']
  ],
  'maths@3': [
    ['The Intermediate Value Theorem applies to…', 'Continuous functions', 'All functions', 'Discrete data only', 'Random sets'],
    ['Newton\'s method is used to find…', 'Roots of equations', 'Areas of circles', 'Volumes of cones', 'Prime numbers'],
    ['The mean of a distribution measures…', 'Central tendency', 'Spread', 'Skewness only', 'Kurtosis only'],
    ['A ring has two operations: addition and…', 'Multiplication', 'Division only', 'Subtraction only', 'Differentiation'],
    ['A topological space is defined using…', 'Open sets', 'Prime numbers', 'Matrices', 'Curves only'],
    ['In linear programming, the aim is to…', 'Optimise an objective subject to constraints', 'Solve any equation', 'Draw graphs', 'Sort data'],
    ['The variance is the square of the…', 'Standard deviation', 'Mean', 'Mode', 'Range'],
    ['Force in mechanics is measured in…', 'Newtons', 'Joules', 'Watts', 'Pascals']
  ],
  'maths@4': [
    ['A Hilbert space is a complete…', 'Inner product space', 'Group', 'Graph', 'Ring only'],
    ['A graph consists of vertices and…', 'Edges', 'Angles', 'Planes', 'Integrals'],
    ['A prime number has exactly…', 'Two positive divisors', 'Three divisors', 'One divisor', 'No divisors'],
    ['A partial differential equation involves…', 'Partial derivatives', 'Only integrals', 'Only matrices', 'No variables'],
    ['Mathematical modelling turns…', 'Real problems into mathematical form', 'Numbers into colours', 'Proofs into stories', 'Data into verses'],
    ['The distance between two points in a plane comes from…', 'Pythagoras\' theorem', 'Newton\'s law', 'Ohm\'s law', 'Boyle\'s law'],
    ['The curvature of a curve measures how…', 'Sharply it bends', 'Long it is', 'Heavy it is', 'Fast it moves'],
    ['The number of edges in a complete graph on 4 vertices is…', '6', '4', '8', '10']
  ]
};
