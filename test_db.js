const { Client } = require('pg');

const passwords = ['000000', 'password', 'postgres', 'root', 'admin', '123456', 'sa'];

async function testConnection() {
  for (const pass of passwords) {
    const client = new Client({
      user: 'postgres',
      host: 'localhost',
      database: 'postgres',
      password: pass,
      port: 5432,
    });

    try {
      await client.connect();
      console.log('Success! Password is: ' + pass);
      await client.end();
      return pass;
    } catch (err) {
      console.log('Failed with password: ' + pass + ' - ' + err.message);
    }
  }
}

testConnection();
