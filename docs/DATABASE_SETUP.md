# Database Setup Guide

## Overview

The King of Court application uses MySQL as its database. This guide covers both local and remote MySQL database setup.

## Database Schema

The application uses the following tables:

1. **users** - Stores user accounts
2. **games** - Stores game information
3. **game_participants** - Links users to games with their scores
4. **refresh_tokens** - Stores refresh tokens for authentication

See `courts_db.sql` for the complete schema definition.

## Local MySQL Setup

### 1. Install MySQL

Download and install MySQL Community Server from [mysql.com](https://dev.mysql.com/downloads/mysql/)

### 2. Configure Environment Variables

Update your `.env` file:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=courts_db
```

### 3. Run Setup Script

```bash
npm run setup:db
```

## Remote MySQL Setup

### Option 1: Cloud Providers

Popular remote MySQL hosting options:

- **AWS RDS** (Amazon Web Services)
- **Google Cloud SQL**
- **Azure Database for MySQL**
- **DigitalOcean Managed Databases**
- **PlanetScale**
- **Railway**

### Option 2: Free MySQL Hosting

For development/testing:

- **db4free.net** - Free MySQL 8.0 hosting
- **FreeSQLDatabase.com** - Free MySQL hosting
- **Clever Cloud** - Free tier with MySQL

### Remote Configuration

1. Create a database on your chosen provider
2. Get your connection credentials
3. Update `.env`:

```env
DB_HOST=your-remote-host.com
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=courts_db
```

For SSL connections (recommended for production), you may need to add:

```env
DB_SSL=true
```

### Example: AWS RDS Setup

1. Create an RDS MySQL instance in AWS Console
2. Configure security group to allow your IP
3. Note the endpoint URL
4. Update `.env`:

```env
DB_HOST=your-db-instance.region.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=your_secure_password
DB_NAME=courts_db
```

### Example: DigitalOcean Setup

1. Create a Managed MySQL Database
2. Add your IP to trusted sources
3. Get connection details from dashboard
4. Update `.env`:

```env
DB_HOST=your-db-do-user-123456-0.db.ondigitalocean.com
DB_PORT=25060
DB_USER=doadmin
DB_PASSWORD=your_password
DB_NAME=courts_db
```

## Running the Setup

After configuring your remote database credentials:

```bash
npm run setup:db
```

This will:

- Connect to your remote MySQL server
- Create the database if it doesn't exist
- Create all required tables
- Optionally load dummy data

## Manual Setup

If you prefer to set up the database manually:

1. Connect to your MySQL server:

   ```bash
   mysql -h your-host -u your-user -p
   ```

2. Create the database:

   ```sql
   CREATE DATABASE courts_db;
   USE courts_db;
   ```

3. Run the schema file:

   ```bash
   mysql -h your-host -u your-user -p courts_db < courts_db.sql
   ```

4. (Optional) Load dummy data:
   ```bash
   mysql -h your-host -u your-user -p courts_db < dummy_data.sql
   ```

## Connection Pooling

The application uses connection pooling for better performance:

- Max 10 concurrent connections
- Automatic connection management
- Keep-alive enabled

These settings can be adjusted in `src/config/database.js`.

## Testing the Connection

Start your application and check the console:

```bash
npm start
```

You should see:

```
✓ Database connected successfully
Server is running on http://localhost:3000
```

## Troubleshooting

### Connection Refused

- Check if MySQL server is running
- Verify host and port are correct
- Check firewall settings

### Access Denied

- Verify username and password
- Check user privileges: `GRANT ALL PRIVILEGES ON courts_db.* TO 'user'@'%';`

### Unknown Database

- Run `npm run setup:db` to create the database
- Or create it manually: `CREATE DATABASE courts_db;`

### SSL Issues (Remote Connections)

- Some cloud providers require SSL
- Check provider documentation for SSL certificate setup

## Security Best Practices

1. **Never commit `.env` file** - It's in `.gitignore` by default
2. **Use strong passwords** for database users
3. **Limit database access** to specific IP addresses when possible
4. **Use SSL/TLS** for remote connections in production
5. **Regular backups** - Set up automated database backups
6. **Separate credentials** for development and production

## Database Migrations

For future schema changes, consider using a migration tool:

- [node-db-migrate](https://db-migrate.readthedocs.io/)
- [Knex.js migrations](http://knexjs.org/)
- [Sequelize migrations](https://sequelize.org/docs/v6/other-topics/migrations/)

## Support

For issues specific to your MySQL provider, consult their documentation:

- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [DigitalOcean Database Docs](https://docs.digitalocean.com/products/databases/)
- [Google Cloud SQL Docs](https://cloud.google.com/sql/docs)
