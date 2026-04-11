import bcrypt from 'bcrypt';

async function generateHash() {
    const password = 'Admin123!';
    const hash = await bcrypt.hash(password, 10);
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
    console.log(`\nUsa este hash en la BD:`);
    console.log(hash);
}

generateHash().catch(console.error);
