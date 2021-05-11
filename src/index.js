const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(express.json());

const customers = [];

function verifyIfCustomerExists(request, response, next) {
  const { id } = request.headers;

  if (!id) {
    return response.status(400).json({
      error: 'Id not provided!'
    })
  }

  const customer = customers.find(customer => customer.id === id);

  if (!customer) {
    return response.status(400).json({
      error: "Customer not found."
    })
  }

  request.customer = customer;

  return next();
}

function getBalance(statements) {
  return statements.reduce((acc, statement) => {
    if (statement.type === 'credit') {
      return acc + statement.amount
    }
    return acc - statement.amount;
  }, 0);
}

app.post('/customer', (request, response) => {
  const { cpf, name } = request.body;

  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists) {
    return response.status(400).json({ 
      error: "Customer already exists!" 
    });
  }

  const id = uuidv4();

  const customer = { cpf, name, id, statements: [] };

  customers.push(customer);

  return response.status(201).json(customer);
});

// app.use(verifyIfCustomerExists);

app.put('/customer', verifyIfCustomerExists, (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(201).json(customer);
});

app.get('/customer', verifyIfCustomerExists, (request, response) => {
  const { customer } = request;

  return response.status(200).json(customer);
});

app.delete('/customer', verifyIfCustomerExists, (request, response) => {
  const { customer } = request;

  customers.splice(customer, 1);

  return response.status(204).json({
    message: 'Customer successfully deleted.'
  });
});

app.get('/statement', verifyIfCustomerExists, (request, response) => {
  const { customer } = request;
  const { date } = request.query;

  let { statements } = customer;

  if (date) {
    const dateFormated = new Date(date + " 00:00")
    
    statements = statements.filter((statement) => {
      return statement.created_at.toDateString() === dateFormated.toDateString();
    });
  }

  const balance = getBalance(statements);

  return response.status(200).json({
    balance,
    statements,
  });
});

app.post('/deposit', verifyIfCustomerExists, (request, response) => {
  const { description, amount } = request.body;
  const { customer } = request;

  const operation = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit',
  };

  customer.statements.push(operation);

  return response.status(201).json({
    message: 'Deposit successfully made!'
  })
});

app.post('/withdraw', verifyIfCustomerExists, (request, response) => {
  const { description, amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statements);

  if (balance < amount) {
    return response.status(400).json({
      error: 'Insuficient balance.',
    })
  }

  const operation = {
    description,
    amount,
    created_at: new Date(),
    type: 'debit',
  };

  customer.statements.push(operation);

  return response.status(201).json({
    message: 'Withdraw successfully made!'
  })
});

app.listen(3333)