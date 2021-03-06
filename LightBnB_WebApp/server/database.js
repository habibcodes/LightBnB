/* eslint-disable camelcase */
const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');

// connect to DB
const pool = new Pool({
  user: 'labber',
  password: 'labber',
  host: 'localhost',
  database: 'lightbnb',
  port: 5432,
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  const queryStr = `
    SELECT *
    FROM users
    WHERE email = $1
  `;

  return pool
    .query(queryStr, [email])
    .then((result) => {
      console.log('Line 32: This is log for getUserEmail:', result.rows[0]);
      // if conditon here for result.rows.length !== 0, resolve
      if (result.rows.length !== 0) {
        return result.rows[0];
      }
      // else return NULL
      console.log('Line 38: Returned NULL because no user in DB');
      return null;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  const queryStr = `
    SELECT *
    FROM users
    WHERE id = $1
  `;

  return pool
    .query(queryStr, [id])
    .then((result) => {
      console.log('Line 33: This is log for getUserWithId:', result.rows[0]);
      // if conditon here for result.rows.length !== 0, resolve
      if (result.rows.length !== 0) {
        return result.rows[0];
      }
      // else return NULL
      console.log('Returned NULL because no ID in DB');
      return null;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  console.log('user object: ', user);
  const queryStr = `
    INSERT INTO users 
      (name, email, password)
    VALUES 
      ($1, $2, $3)
    RETURNING
      *
  `;

  return pool
    .query(queryStr, [user.name, user.email, user.password])
    .then((result) => {
      console.log('This user was inserted into DB:', result);
      return result;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  const queryStr = `
    SELECT *
    FROM 
      reservations
    JOIN
      users ON users.id = $1
    WHERE
      users.id = $1
    LIMIT 
      $2
  `;

  return pool
    .query(queryStr, [guest_id, limit])
    .then((result) => {
      console.log('Line 129 log for reservations:', result.rows);
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  console.log('Line 161 option: ', options);
  // 1
  const queryParams = [];
  // 2
  let queryString = `
  SELECT 
    properties.*, 
    avg(property_reviews.rating) as average_rating
  FROM 
    properties
  JOIN 
    property_reviews ON properties.id = property_id
  `;

  let counter = 0;

  if (options.owner_id) {
    queryParams.push(`%${options.owner_id}%`);
    queryString += `WHERE owner_id = $${queryParams.length} `;
  }

  // check CITY
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
    counter++;
  }

  // check minimum_price_per_night
  if (options.minimum_price_per_night) {
    queryParams.push(`${options.minimum_price_per_night * 100}`);
    if (counter > 0) {
      queryString += `AND cost_per_night > $${queryParams.length} `;
    } else {
      queryString += `WHERE cost_per_night > $${queryParams.length} `;
    }
    counter++;
  }
  // check maximum_price_per_night
  if (options.maximum_price_per_night) {
    queryParams.push(`${options.maximum_price_per_night * 100}`);
    if (counter > 0) {
      queryString += `AND cost_per_night < $${queryParams.length} `;
    } else {
      queryString += `WHERE cost_per_night < $${queryParams.length} `;
    }
    counter++;
  }
  // // check minimum_rating
  if (options.minimum_rating) {
    queryParams.push(`${options.minimum_rating}`);
    if (counter > 0) {
      queryString += `AND rating >= $${queryParams.length} `;
    } else {
      queryString += `WHERE rating >= $${queryParams.length} `;
    }
    counter++;
  }

  // 4
  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  console.log('Line 224: values in queryParams: ', queryParams);

  // 5
  console.log(queryString, queryParams);

  // 6
  return pool
    .query(queryString, queryParams)
    .then((res) => res.rows);

};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  console.log('Line 233: property object: ', property);

  const propertyColumns = Object.keys(property);
  const propertyValues = Object.values(property);
  const numberOfValues = propertyColumns.length;

  const parameterisedValues = [];
  
  for (let i = 1; i <= numberOfValues; i++) {
    let elementValue = `$${i}`;
    parameterisedValues.push(elementValue);
  }
  
  const queryStr = `
    INSERT INTO properties 
      (${propertyColumns.join(', ')})
    VALUES 
      (${parameterisedValues.join(', ')})
    RETURNING
      *
  `;

  return pool
    .query(queryStr, propertyValues)
    .then((result) => {
      console.log('This property was inserted into DB:', result);
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.addProperty = addProperty;
