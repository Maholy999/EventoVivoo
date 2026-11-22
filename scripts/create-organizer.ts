import { pool } from '../src/db/client';
import { hashPassword } from '../src/domain/password';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Uso: npx tsx scripts/create-organizer.ts <email> <password> "<name>"');
    console.error('Ejemplo: npx tsx scripts/create-organizer.ts org.nuevo@eventovivo.edu Secret123! "Prof. Juan Perez"');
    process.exit(1);
  }

  const [email, password, name] = args;

  console.log(`Creando organizador: ${email} (${name})...`);
  const passwordHash = await hashPassword(password);

  try {
    const res = await pool.query(
      `INSERT INTO users (email, password_hash, role, name)
       VALUES ($1, $2, 'organizer', $3)
       RETURNING id, email, role, name`,
      [email.toLowerCase().trim(), passwordHash, name.trim()]
    );

    console.log('✅ Organizador creado exitosamente:');
    console.log(res.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      console.error('❌ Error: El correo electrónico ya está registrado.');
    } else {
      console.error('❌ Error al crear organizador:', err.message);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
