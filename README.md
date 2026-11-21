# PG & Hostel Rent Manager — Spring Boot Microservices

A beginner-friendly microservices project. A PG/hostel owner manages rooms, tenants, monthly rent
and maintenance complaints. Tenants log in to see their dues and raise complaints.

## 1. What you are building

```
                         Browser (simple UI, served by tenant-service)
                                       |
         +-----------------------------+-----------------------------+
         |                             |                             |
 tenant-service :8081          rent-service :8082         complaint-service :8083
 rooms, tenants, LOGIN         monthly rent, payments     maintenance complaints
 PostgreSQL (:5433)            MySQL (:3307)              MongoDB (:27017)
         |                        ^                             ^
         |   REST (synchronous)   |   REST (synchronous)        |
         |<-----------------------+-----------------------------+
         |
         +--- Kafka topic "tenant.checked-out" (asynchronous) ---> rent-service
                                                              ---> complaint-service
```

| Service | Port | Database | Owns |
|---|---|---|---|
| tenant-service | 8081 | PostgreSQL | users and login (JWT), rooms, tenants, the UI |
| rent-service | 8082 | MySQL | monthly rent charges, payments |
| complaint-service | 8083 | MongoDB | complaints with photo links and status history |

**Two ways the services talk to each other**

1. **REST (synchronous):** rent-service and complaint-service call tenant-service and wait for an answer
   (e.g. "is tenant 7 active? what room are they in?").
2. **Kafka (asynchronous):** when an owner checks a tenant out, tenant-service publishes one message.
   rent-service and complaint-service each receive it on their own, a moment later, and react.
   tenant-service does not know or care who is listening.

**Login:** tenant-service checks the password and hands out a JWT token. The other two services trust that
token because all three share the same secret key (`app.jwt.secret`). Roles: `OWNER` and `TENANT`.

## 2. Install the tools (one time)

| Tool | Version | Check with |
|---|---|---|
| JDK | 17 or newer (19 and 21 both work) | `java -version` |
| Maven | 3.9+ | `mvn -version` |
| Docker Desktop | recent | `docker --version` |
| An editor | IntelliJ IDEA Community or VS Code with Java extensions | |

## 3. Start the databases and Kafka

From the project root (the folder containing `docker-compose.yml`):

```bash
docker compose up -d
docker compose ps        # all four containers should say "running"
```

Why host ports 5433 and 3307? So they do not clash with a PostgreSQL or MySQL you may already have installed.

## 4. Build

```bash
mvn clean install -DskipTests
```

This builds the `common` module (shared JWT code and the Kafka event class) first, then the three services.
The first build downloads many libraries and takes a few minutes. You should see `BUILD SUCCESS`.

## 5. Run the three services

Open **three terminals** in the project root. Start tenant-service first.

```bash
# terminal 1
java -jar tenant-service/target/tenant-service-1.0.0.jar

# terminal 2
java -jar rent-service/target/rent-service-1.0.0.jar

# terminal 3
java -jar complaint-service/target/complaint-service-1.0.0.jar
```

Each prints `Started ...Application in ... seconds`. The tables (PostgreSQL, MySQL) are created automatically
on first start (`ddl-auto: update`); MongoDB creates its collection when the first complaint is saved.

You can also run them from your IDE: open the project as a Maven project and run each `...Application` class.

### Alternative: run with Maven

```bash
cd tenant-service && mvn spring-boot:run
```

(Run `mvn clean install -DskipTests` at the root at least once first, so `common` is installed.)

## 6. Use the application

Open **http://localhost:8081** (use `localhost`, not `127.0.0.1` — the services only allow that origin).

1. Click *First time? Create the owner account*. Signup code: `PG-OWNER-2026` (set in
   `tenant-service/src/main/resources/application.yml`). Then log in.
2. **Rooms:** add room `101`, floor 1, rent 6000, capacity 2.
3. **Tenants:** add a tenant, choose room 101, and give them a login (e.g. `ravi` / `ravi123`).
4. **Rent:** pick the current month, click *Generate rent for all active tenants*.
   Then *Record payment* — try a partial amount and watch the status become `PARTIAL`, then pay the rest for `PAID`.
5. Open a private/incognito window, log in as `ravi`. See **My rent**; in **My complaints** raise a complaint.
6. Back as owner, **Complaints:** change its status to `IN_PROGRESS`, then `RESOLVED`. Open *History*.
7. **The Kafka demo:** as `ravi`, raise one more complaint (leave it OPEN). As owner, go to **Tenants** and
   *Check out* ravi. A moment later:
   - **Rent** tab: his charges show *(checked out)* — rent-service reacted to the Kafka message.
   - **Complaints** tab: his open complaint is `CLOSED` with the note "Closed automatically: tenant checked out".
   - ravi can no longer log in.

## 7. Look inside the databases (great for your report and viva)

```bash
# PostgreSQL (tenant-service)
docker exec -it pgrent-postgres psql -U pgrent -d tenantdb -c "select * from tenant;"
docker exec -it pgrent-postgres psql -U pgrent -d tenantdb -c "select id, username, role, tenant_id, enabled from app_user;"

# MySQL (rent-service)
docker exec -it pgrent-mysql mysql -upgrent -ppgrent rentdb -e "select * from rent_charge; select * from payment;"

# MongoDB (complaint-service)
docker exec -it pgrent-mongo mongosh complaintdb --eval "db.complaints.find().pretty()"

# Watch the Kafka messages
docker exec -it pgrent-kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic tenant.checked-out --from-beginning
```

## 8. Project structure

```
pg-rent-system/
  pom.xml                  parent: Java 17+, Spring Boot 3.5.0, lists the 4 modules
  docker-compose.yml       PostgreSQL, MySQL, MongoDB, Kafka
  common/                  shared library (NOT a running service)
    security/              JwtService (create/verify token), JwtAuthFilter, AuthUser, CurrentUser
    events/                TenantCheckedOutEvent, Topics
    web/                   GlobalExceptionHandler -> errors as {"message": "..."}
  tenant-service/
    domain/ repo/          JPA entities (Room, Tenant, AppUser) and repositories
    service/               business rules (capacity check, checkout + Kafka publish, login)
    web/                   REST controllers + DTOs
    config/                SecurityConfig, Kafka topic
    resources/static/      the UI: index.html, app.js, style.css
  rent-service/
    domain/ repo/          RentCharge, Payment
    service/               RentService, TenantClient (REST call), RentScheduler (monthly job)
    messaging/             Kafka listener
  complaint-service/
    domain/ repo/          Complaint (MongoDB document), TimelineEntry
    service/               ComplaintService, TenantClient (REST call)
    messaging/             Kafka listener
```

Each service follows the same layers: **controller** (HTTP in/out) -> **service** (rules) -> **repository** (database).

## 9. API reference

All endpoints except `/api/auth/**` need the header `Authorization: Bearer <token>`.

**tenant-service (8081)**

| Method and path | Who | Purpose |
|---|---|---|
| POST `/api/auth/register-owner` | anyone with the signup code | create owner account |
| POST `/api/auth/login` | anyone | returns a token |
| POST / GET `/api/rooms` | owner | add / list rooms (with occupancy) |
| POST `/api/tenants` | owner | add tenant + create their login |
| GET `/api/tenants?status=ACTIVE` | owner | list tenants |
| GET `/api/tenants/me` | tenant | own details |
| GET `/api/tenants/{id}` | owner, or that tenant | one tenant (used by other services) |
| PUT `/api/tenants/{id}/checkout` | owner | check out, disable login, publish Kafka event |

**rent-service (8082)**

| Method and path | Who | Purpose |
|---|---|---|
| POST `/api/rent/charges/generate?month=2026-12` | owner | create rent for all active tenants |
| POST `/api/rent/charges` | owner | create one charge (verifies tenant is active via REST) |
| GET `/api/rent/charges?month=&status=` | owner | list charges |
| POST `/api/rent/payments` | owner | record a (partial) payment |
| GET `/api/rent/charges/{id}/payments` | owner | payment history of a charge |
| GET `/api/rent/tenants/{id}/dues` | owner, or that tenant | dues of a tenant |
| GET `/api/rent/my-dues` | tenant | own dues |

Rent is also generated automatically at 06:00 on the 1st of every month (`RentScheduler`).

**complaint-service (8083)**

| Method and path | Who | Purpose |
|---|---|---|
| POST `/api/complaints` | tenant | raise a complaint |
| GET `/api/complaints/my` | tenant | own complaints |
| GET `/api/complaints?status=&room=` | owner | all complaints |
| PATCH `/api/complaints/{id}/status` | owner | change status with a note |

Example with curl:

```bash
TOKEN=$(curl -s -X POST localhost:8081/api/auth/login -H "Content-Type: application/json" \
  -d '{"username":"owner1","password":"secret123"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')
curl -s localhost:8081/api/rooms -H "Authorization: Bearer $TOKEN"
```

## 10. Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| `Connection refused` to a database on start | Containers not running: `docker compose ps`, then `docker compose up -d`. Wait ~20 seconds after first start. |
| `Port 8081 was already in use` | Another program uses it. Stop it or change `server.port` in that service's `application.yml` (and the `API` object at the top of `app.js`). |
| UI says "Cannot reach rent-service" | Start that service, and open the UI at `http://localhost:8081`. |
| Login works but other tabs give 401 | `app.jwt.secret` differs between services. It must be identical in all three `application.yml` files. |
| Kafka warnings in the logs right after start | Normal for a few seconds while Kafka starts. |
| Checkout works but rent/complaints do not change | Check the rent-service and complaint-service terminals for the `Tenant ... checked out` log line; check both are running. |
| Build fails | Copy the first `[ERROR]` line and ask for help. Confirm `java -version` says 17 or newer. |

To wipe all data and start fresh: `docker compose down -v`.

## 11. Known simplifications (mention these in your report as "future work")

- **Lost events:** if Kafka is down at the moment of checkout, the event is not retried. The production fix
  is the *outbox pattern* (save the event in the database in the same transaction, publish it later).
- **Secrets in config files:** the JWT secret and DB passwords are in `application.yml`. Real systems use
  environment variables or a secrets manager.
- **Open owner signup guarded only by a code**, no password reset, no HTTPS.
- **Photos are links**, not uploads.
- **Rent for a partial first month is not prorated**; a full month is charged.
- **`ddl-auto: update`** lets Hibernate create tables. Real projects use migrations (Flyway).
- **No automated tests yet.**
- Services call each other by fixed URLs (`localhost:8081`). Real systems use service discovery or an API gateway.
