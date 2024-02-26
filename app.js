const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const format = require('date-fns/format')
const isValid = require('date-fns/isValid')
const {toDate} = require('date-fns')
const dbPath = path.join(__dirname, 'todoApplication.db')

const app = express()

app.use(express.json())

let db = null

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const checkRequest = async (request, response, next) => {
  const {priority, status, search_q = '', category, date} = request.query
  const {todoId} = request.params
  if (category !== undefined) {
    const validateCategory = ['WORK', 'HOME', 'LEARNING']
    const validCategory = validateCategory.includes(category)
    if (validCategory === true) {
      request.category = category
    } else {
      response.status(400)
      response.send('Invalid Todo Category')
      return
    }
  }

  if (priority !== undefined) {
    const validatePriority = ['HIGH', 'MEDIUM', 'LOW']
    const validPriority = validatePriority.includes(priority)
    if (validPriority === true) {
      request.priority = priority
    } else {
      response.status(400)
      response.send('Invalid Todo Priority')
      return
    }
  }

  if (status !== undefined) {
    const validateStatus = ['TO DO', 'IN PROGRESS', 'DONE']
    const validStatus = validateStatus.includes(status)
    if (validStatus === true) {
      request.status = status
    } else {
      response.status(400)
      response.send('Invalid Todo Status')
      return
    }
  }
  if (date !== undefined) {
    try {
      const myDate = new Date(date)
      const formatDate = format(new Date(date), 'yyyy-mm-dd')
      const result = toDate(
        new Date(
          `${myDate.getFullYear()}-${
            myDate.getMonth() + 1
          }-${myDate.getDate()}`,
        ),
      )
      const isValidDate = isValid(result)
      if (isValidDate === true) {
        request.date = formatDate
      } else {
        response.status(400)
        response.send('Invalid Due Date')
        return
      }
    } catch (e) {
      response.status(400)
      response.send('Invalid Due Date')
      return
    }
  }
  request.todoId = todoId
  request.search_q = search_q
  next()
}

const checkRequestBody = (request, response, next) => {
  const {id, todo, category, priority, status, dueDate, search_q} = request.body
  const {todoId} = request.params

  if (category !== undefined) {
    const validateCategory = ['WORK', 'HOME', 'LEARNING']
    const validCategory = validateCategory.includes(category)
    if (validCategory === true) {
      request.category = category
    } else {
      response.status(400)
      response.send('Invalid Todo Category')
      return
    }
  }

  if (priority !== undefined) {
    const validatePriority = ['HIGH', 'MEDIUM', 'LOW']
    const validPriority = validatePriority.includes(priority)
    if (validPriority === true) {
      request.priority = priority
    } else {
      response.status(400)
      response.send('Invalid Todo Priority')
      return
    }
  }

  if (status !== undefined) {
    const validateStatus = ['TO DO', 'IN PROGRESS', 'DONE']
    const validStatus = validateStatus.includes(status)
    if (validStatus === true) {
      request.status = status
    } else {
      response.status(400)
      response.send('Invalid Todo Status')
      return
    }
  }
  if (dueDate !== undefined) {
    try {
      const myDate = new Date(dueDate)
      const formatDate = format(new Date(dueDate), 'yyyy-mm-dd')
      const result = toDate(
        new Date(
          `${myDate.getFullYear()}-${
            myDate.getMonth() + 1
          }-${myDate.getDate()}`,
        ),
      )
      const isValidDate = isValid(result)
      if (isValidDate === true) {
        request.date = formatDate
      } else {
        response.status(400)
        response.send('Invalid Due Date')
        return
      }
    } catch (e) {
      response.status(400)
      response.send('Invalid Due Date')
      return
    }
  }
  request.todoId = todoId
  request.search_q = search_q
  next()
}

//Returns a list of all todos whose status is 'TO DO'
app.get('/todos/', checkRequest, async (request, response) => {
  const {
    priority = '',
    status = '',
    search_q = '',
    category = '',
  } = request.query
  let getTodosQuery = `
      SELECT
        id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate 
      FROM
        todo
      WHERE
        todo LIKE '%${search_q}%' AND priority LIKE '%${priority}%'
        AND status LIKE '%${status}%' AND category LIKE '%${category}%'`
  const todos = await db.all(getTodosQuery)
  response.send(todos)
})

app.get('/todos/:todoId/', checkRequest, async (request, response) => {
  const {todoId} = request.params
  const getTodoQuery = `
    SELECT
      id,
      todo,
      priority,
      status,
      category,
      due_date AS dueDate
    FROM
      todo
    WHERE
      id = ${todoId};`
  const todo = await db.get(getTodoQuery)
  response.send(todo)
})

app.get('/agenda/', checkRequest, async (request, response) => {
  const {date} = request.query
  try {
    const getAgendaQuery = `
      SELECT
        id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
      FROM
        todo
      WHERE
        due_date = '${date}';`
    const agenda = await db.all(getAgendaQuery)
    if (agenda.length === 0) {
      response.status(400)
      response.send('Invalid Due Date')
    }
    response.send(agenda)
  } catch (error) {
    console.error('Error fetching agenda:', error)
    response.status(500).send('Internal Server Error')
  }
})

app.post('/todos/', checkRequestBody, async (request, response) => {
  const {id, todo, category, priority, status, dueDate} = request.body
  const addTodoQuery = `
    INSERT INTO
      todo (id, todo, category, priority, status, due_date)
    VALUES
      (${id}, '${todo}', '${category}', '${priority}', '${status}', '${dueDate}');`
  const createUser = await db.run(addTodoQuery);
  console.log(createUser);
  response.send('Todo Successfully Added')
})

app.put('/todos/:todoId/', checkRequestBody, async (request, response) => {
  const {todoId} = request.params
  const {todo, category, priority, status, dueDate} = request.body

  let updateTodoQuery = null
  switch (true) {
    case status !== undefined:
      updateTodoQuery = `
        UPDATE
          todo
        SET
          status = '${status}'
        WHERE
          id = ${todoId}`
      await db.run(updateTodoQuery)
      response.send('Status Updated')
      break
    case priority !== undefined:
      updateTodoQuery = `
        UPDATE
          todo
        SET
          priority = '${priority}'
        WHERE
          id = ${todoId}`
      await db.run(updateTodoQuery)
      response.send('Priority Updated')
      break
    case todo !== undefined:
      updateTodoQuery = `
        UPDATE
          todo
        SET
          todo = '${todo}'
        WHERE
          id = ${todoId}`
      await db.run(updateTodoQuery)
      response.send('Todo Updated')
      break
    case category !== undefined:
      updateTodoQuery = `
        UPDATE
          todo
        SET
          category = '${category}'
        WHERE
          id = ${todoId}`
      await db.run(updateTodoQuery)
      response.send('Category Updated')
      break
    case dueDate !== undefined:
      updateTodoQuery = `
        UPDATE
          todo
        SET
          due_date = '${dueDate}'
        WHERE
          id = ${todoId}`
      await db.run(updateTodoQuery)
      response.send('Due Date Updated')
      break
  }
})

app.delete('/todos/:todoId/', checkRequest, async (request, response) => {
  const {todoId} = request.params
  const deleteTodoQuery = `
    DELETE FROM
      todo
    WHERE
      id = ${todoId};`
  await db.run(deleteTodoQuery)
  response.send('Todo Deleted')
})
module.exports = app