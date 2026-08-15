export const databaseSql = String.raw`
PRAGMA foreign_keys = ON;

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  segment TEXT NOT NULL CHECK (segment IN ('Consumer', 'Corporate', 'Startup')),
  joined_at TEXT NOT NULL,
  total_spent REAL NOT NULL DEFAULT 0
);

INSERT INTO customers VALUES
  (1,'Minh Anh','Vietnam','Ho Chi Minh City','Consumer','2022-01-15',2450),
  (2,'Liam Chen','Singapore','Singapore','Corporate','2021-06-03',3980),
  (3,'Sofia Rossi','Italy','Milan','Consumer','2023-02-20',1740),
  (4,'Noah Smith','USA','Seattle','Startup','2022-11-11',1250),
  (5,'Emma Dubois','France','Lyon','Consumer','2024-01-08',980),
  (6,'Hana Kim','South Korea','Seoul','Corporate','2020-09-27',5220),
  (7,'Oliver Brown','UK','Bristol','Startup','2023-07-14',760),
  (8,'Lan Nguyen','Vietnam','Da Nang','Corporate','2021-12-01',4310),
  (9,'Mateo Silva','Brazil','Sao Paulo','Consumer','2024-03-19',640),
  (10,'Aisha Khan','UAE','Dubai','Startup','2022-05-30',2130),
  (11,'Jonas Berg','Sweden','Malmo','Consumer','2023-10-05',1120),
  (12,'Maya Patel','India','Pune','Corporate','2021-04-18',4760),
  (13,'Kim Bui','Vietnam','Hue','Consumer','2025-01-12',0);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  price REAL NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)
);

INSERT INTO products VALUES
  (1,'Paper Notebook','Stationery',8.5,120),
  (2,'Fountain Pen','Stationery',24,45),
  (3,'Desk Lamp','Home Office',46,18),
  (4,'Canvas Backpack','Travel',72,31),
  (5,'Ceramic Mug','Home Office',15,80),
  (6,'Mechanical Keyboard','Electronics',110,12),
  (7,'USB-C Hub','Electronics',58,25),
  (8,'Travel Pouch','Travel',22,65),
  (9,'Monitor Stand','Home Office',64,20),
  (10,'Gel Pen Set','Stationery',12,0),
  (11,'Webcam Cover','Electronics',6,150);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  order_date TEXT NOT NULL,
  status TEXT NOT NULL,
  total REAL NOT NULL CHECK (total >= 0)
);

INSERT INTO orders VALUES
  (101,1,'2024-01-05','completed',92),(102,2,'2024-01-16','completed',220),
  (103,1,'2024-02-12','refunded',46),(104,3,'2024-02-18','completed',144),
  (105,4,'2024-03-03','pending',58),(106,6,'2024-03-11','completed',318),
  (107,8,'2024-03-29','completed',180),(108,2,'2024-04-07','cancelled',72),
  (109,5,'2024-04-22','completed',67),(110,10,'2024-05-04','completed',156),
  (111,12,'2024-05-19','completed',330),(112,7,'2024-06-02','pending',44),
  (113,6,'2024-06-21','completed',128),(114,9,'2024-07-09','completed',36),
  (115,3,'2024-07-28','refunded',110),(116,11,'2024-08-13','completed',95),
  (117,8,'2024-09-01','completed',246),(118,12,'2024-09-17','completed',116),
  (119,1,'2024-10-06','completed',204),(120,10,'2024-10-25','pending',82),
  (121,2,'2024-11-08','completed',174),(122,6,'2024-11-29','completed',265),
  (123,5,'2024-12-10','cancelled',48),(124,12,'2024-12-20','completed',190);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price REAL NOT NULL CHECK (unit_price >= 0)
);

INSERT INTO order_items VALUES
  (1,101,4,1,72),(2,101,1,2,10),(3,102,6,2,110),(4,103,3,1,46),
  (5,104,4,2,72),(6,105,7,1,58),(7,106,6,2,110),(8,106,7,1,58),(9,106,5,2,20),
  (10,107,9,2,64),(11,107,2,2,26),(12,109,5,3,15),(13,109,8,1,22),
  (14,110,4,1,72),(15,110,7,1,58),(16,110,2,1,26),(17,111,6,3,110),
  (18,112,8,2,22),(19,113,9,2,64),(20,114,10,3,12),(21,115,6,1,110),
  (22,116,1,5,9),(23,116,2,2,25),(24,117,3,2,46),(25,117,4,2,72),(26,117,1,1,10),
  (27,118,7,2,58),(28,119,6,1,110),(29,119,3,1,46),(30,119,2,2,24),
  (31,120,8,2,22),(32,120,5,2,19),(33,121,7,3,58),(34,122,6,2,110),(35,122,5,3,15),
  (36,124,4,2,72),(37,124,2,1,24),(38,124,8,1,22);

CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  budget REAL NOT NULL
);
INSERT INTO departments VALUES
  (1,'Engineering',600000),(2,'Sales',420000),(3,'Operations',310000),(4,'Design',240000),(5,'Research',360000),(6,'Legal',180000);

CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  manager_id INTEGER REFERENCES employees(id),
  hire_date TEXT NOT NULL,
  salary REAL NOT NULL,
  email TEXT
);
INSERT INTO employees VALUES
  (1,'Thu Tran',1,NULL,'2018-04-12',98000,'thu@example.com'),
  (2,'Alex Wu',2,NULL,'2019-07-01',92000,'alex@example.com'),
  (3,'Priya Shah',3,NULL,'2017-11-20',90000,'priya@example.com'),
  (4,'Evan Lee',4,NULL,'2020-02-15',87000,'evan@example.com'),
  (5,'Rina Mori',1,1,'2021-03-08',72000,'rina@example.com'),
  (6,'Bao Pham',1,1,'2022-06-19',68000,'bao@example.com'),
  (7,'Nora Ali',2,2,'2021-09-30',70000,'nora@example.com'),
  (8,'Leo Martin',2,2,'2023-01-11',61000,NULL),
  (9,'Ivy Nguyen',3,3,'2022-10-03',65000,'ivy@example.com'),
  (10,'Omar Aziz',4,4,'2023-05-25',63000,NULL),
  (11,'Sara Lind',5,NULL,'2020-08-14',94000,'sara@example.com'),
  (12,'Diego Cruz',5,11,'2024-02-01',67000,'diego@example.com');

CREATE TABLE libraries (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  branch_type TEXT NOT NULL,
  visits_2023 INTEGER,
  visits_2024 INTEGER,
  staff INTEGER NOT NULL
);
INSERT INTO libraries VALUES
  (1,'Central Library','CA','Central',520000,548000,42),(2,'Mission Branch','CA','Branch',184000,201000,14),
  (3,'Lakeview Library','WA','Central',310000,298000,26),(4,'Pine Branch','WA','Branch',121000,134000,9),
  (5,'Riverside Library','TX','Central',402000,455000,31),(6,'Oak Branch','TX','Branch',NULL,88000,7),
  (7,'Harbor Library','NY','Central',610000,590000,48),(8,'Queens West','NY','Branch',244000,267000,18),
  (9,'Green Library','OR','Central',198000,225000,17),(10,'Hill Branch','OR','Branch',76000,71000,6),
  (11,'Metro Library','IL','Central',365000,390000,29),(12,'South Branch','IL','Branch',99000,NULL,8);

CREATE TABLE survey_responses (
  id INTEGER PRIMARY KEY,
  region TEXT NOT NULL,
  channel TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  completed_at TEXT NOT NULL
);
INSERT INTO survey_responses VALUES
  (1,'North','Web',5,'2024-01-10 09:15:00'),(2,'North','Store',4,'2024-01-12 14:20:00'),
  (3,'South','Web',3,'2024-02-02 08:05:00'),(4,'South','Phone',2,'2024-02-08 17:45:00'),
  (5,'East','Store',5,'2024-03-11 11:30:00'),(6,'East','Web',4,'2024-03-19 19:10:00'),
  (7,'West','Phone',3,'2024-04-06 07:50:00'),(8,'West','Store',4,'2024-04-18 13:25:00'),
  (9,'North','Web',4,'2024-05-09 10:00:00'),(10,'South','Store',5,'2024-05-21 16:40:00'),
  (11,'East','Phone',1,'2024-06-03 12:10:00'),(12,'West','Web',5,'2024-06-29 21:15:00'),
  (13,'North','Phone',3,'2024-07-07 15:20:00'),(14,'South','Web',4,'2024-08-14 18:00:00'),
  (15,'East','Store',4,'2024-09-22 09:45:00'),(16,'West','Store',2,'2024-10-05 11:05:00'),
  (17,'North','Web',5,'2024-11-18 20:30:00'),(18,'South','Phone',3,'2024-12-01 06:55:00');

CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES customers(id),
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL
);
INSERT INTO events VALUES
  (1,1,'login','2024-01-02 08:10:00',12),(2,2,'purchase','2024-01-02 10:35:00',8),
  (3,1,'support','2024-01-15 16:20:00',34),(4,3,'login','2024-02-03 07:55:00',6),
  (5,4,'purchase','2024-02-14 21:05:00',11),(6,6,'login','2024-03-01 09:00:00',18),
  (7,8,'support','2024-03-10 13:40:00',42),(8,2,'login','2024-04-02 18:25:00',9),
  (9,5,'purchase','2024-04-19 11:15:00',7),(10,10,'login','2024-05-06 06:45:00',15),
  (11,12,'purchase','2024-05-20 14:30:00',10),(12,7,'support','2024-06-12 17:05:00',27),
  (13,6,'purchase','2024-07-04 20:10:00',13),(14,9,'login','2024-07-22 08:35:00',5),
  (15,3,'support','2024-08-16 12:00:00',31),(16,11,'login','2024-09-07 19:50:00',14),
  (17,8,'purchase','2024-10-11 09:25:00',6),(18,12,'support','2024-11-03 15:15:00',38),
  (19,1,'purchase','2024-12-09 22:05:00',9),(20,10,'login','2024-12-21 10:40:00',16);

CREATE TABLE shipments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id),
  shipped_at TEXT,
  delivered_at TEXT,
  carrier TEXT
);
INSERT INTO shipments VALUES
  (1,101,'2024-01-06 09:00:00','2024-01-08 15:30:00','Lotus'),
  (2,102,'2024-01-17 11:15:00','2024-01-21 10:00:00','Swift'),
  (3,104,'2024-02-19 08:30:00','2024-02-22 17:20:00','Lotus'),
  (4,106,'2024-03-12 14:00:00','2024-03-14 09:10:00','Northstar'),
  (5,107,'2024-03-30 10:40:00','2024-04-03 16:00:00','Swift'),
  (6,109,'2024-04-23 12:00:00','2024-04-25 18:45:00','Lotus'),
  (7,110,'2024-05-05 07:20:00','2024-05-09 13:15:00','Northstar'),
  (8,111,'2024-05-20 16:10:00','2024-05-22 11:30:00','Swift'),
  (9,113,'2024-06-22 09:45:00',NULL,'Lotus'),
  (10,116,'2024-08-14 13:00:00','2024-08-18 12:20:00','Northstar'),
  (11,117,'2024-09-02 08:00:00','2024-09-04 14:10:00','Swift'),
  (12,119,'2024-10-07 15:30:00','2024-10-11 09:00:00','Lotus');

CREATE TABLE producers (
  id INTEGER PRIMARY KEY,
  company TEXT,
  state TEXT,
  zip TEXT,
  activity TEXT,
  inspected_at TEXT
);
INSERT INTO producers VALUES
  (1,'Green Valley Foods','CA','94107','active','2024-01-12'),
  (2,'Sunrise Poultry LLC','TX','75201','Active','2024-02-08'),
  (3,'River Meats, Inc.','NY','1001','ACTIVE','2024-02-19'),
  (4,'Coastal Eggs','CA','94016','inactive','2023-11-30'),
  (5,'Prairie Protein','IL','60601','active',NULL),
  (6,'Oak Farm Foods','TX',NULL,'pending','2024-03-15'),
  (7,'Blue Hill Poultry','WA','98101','Active','2024-04-02'),
  (8,'Metro Meats','NY','10012','active','2024-04-17'),
  (9,'Desert Eggs','TX','73301','inactive','2024-05-05'),
  (10,'Harbor Foods','WA','9811','ACTIVE',NULL),
  (11,NULL,'OR','97201','pending','2024-05-21'),
  (12,'Prairie  Protein','IL','60602','active','2024-06-01');

CREATE TABLE temperature_readings (
  id INTEGER PRIMARY KEY,
  city TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  max_temp REAL,
  min_temp REAL
);
INSERT INTO temperature_readings VALUES
  (1,'Da Nang','2024-01-15',27,20),(2,'Da Nang','2024-04-15',32,25),(3,'Da Nang','2024-07-15',35,27),(4,'Da Nang','2024-10-15',29,23),
  (5,'Seattle','2024-01-15',9,3),(6,'Seattle','2024-04-15',15,7),(7,'Seattle','2024-07-15',27,16),(8,'Seattle','2024-10-15',16,9),
  (9,'Milan','2024-01-15',8,1),(10,'Milan','2024-04-15',19,10),(11,'Milan','2024-07-15',32,22),(12,'Milan','2024-10-15',18,9),
  (13,'Dubai','2024-01-15',25,16),(14,'Dubai','2024-04-15',33,23),(15,'Dubai','2024-07-15',42,31),(16,'Dubai','2024-10-15',35,25);

CREATE INDEX orders_customer_idx ON orders(customer_id);
CREATE INDEX events_occurred_idx ON events(occurred_at);
`;

export const tableCatalog = {
  customers: ['id INTEGER PK', 'name TEXT', 'country TEXT', 'city TEXT', 'segment TEXT', 'joined_at TEXT', 'total_spent REAL'],
  products: ['id INTEGER PK', 'name TEXT', 'category TEXT', 'price REAL', 'stock INTEGER'],
  orders: ['id INTEGER PK', 'customer_id INTEGER FK', 'order_date TEXT', 'status TEXT', 'total REAL'],
  order_items: ['id INTEGER PK', 'order_id INTEGER FK', 'product_id INTEGER FK', 'quantity INTEGER', 'unit_price REAL'],
  departments: ['id INTEGER PK', 'name TEXT', 'budget REAL'],
  employees: ['id INTEGER PK', 'name TEXT', 'department_id INTEGER FK', 'manager_id INTEGER FK', 'hire_date TEXT', 'salary REAL', 'email TEXT'],
  libraries: ['id INTEGER PK', 'name TEXT', 'state TEXT', 'branch_type TEXT', 'visits_2023 INTEGER', 'visits_2024 INTEGER', 'staff INTEGER'],
  survey_responses: ['id INTEGER PK', 'region TEXT', 'channel TEXT', 'rating INTEGER', 'completed_at TEXT'],
  events: ['id INTEGER PK', 'user_id INTEGER FK', 'event_type TEXT', 'occurred_at TEXT', 'duration_minutes INTEGER'],
  shipments: ['id INTEGER PK', 'order_id INTEGER FK', 'shipped_at TEXT', 'delivered_at TEXT', 'carrier TEXT'],
  producers: ['id INTEGER PK', 'company TEXT', 'state TEXT', 'zip TEXT', 'activity TEXT', 'inspected_at TEXT'],
  temperature_readings: ['id INTEGER PK', 'city TEXT', 'observed_at TEXT', 'max_temp REAL', 'min_temp REAL'],
};
