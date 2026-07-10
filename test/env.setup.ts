// Bootstrap de entorno para la suite de tests (preload en bunfig.toml).
// Setea secretos dummy para los módulos que cargan `config` al importarse
// (p.ej. el controller de chat vía firebase.service → app-config → env).
// No afecta a la app real: `||=` solo rellena lo ausente, respetando `.env`.
process.env.JWT_SECRET ||= "test-jwt-secret";
process.env.DATABASE_URL ||= "postgres://user:pass@localhost:5432/test";
