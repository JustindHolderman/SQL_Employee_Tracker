const {Client} = require("pg");
const tableMaker = require("./tableMaker");
const inquirer = require("inquirer");

const pgQuery = async (option, client) => {
    
    //Declaring variables for simplicity and reusability
    let department;
    let departments;
    let role;
    let roles;
    let roleId;
    let employee;
    let employees;

    //Switch statement to determine which query to run based on user input
    switch (option) {
        case "View all departments":
            department = await client.query('SELECT * FROM department');
            tableMaker(department);
            break;


        case "View all roles":
            role = await client.query(
                'SELECT role.id, role.title, department,.name AS department, role.salary FROM role LEFT JOIN department ON role.department_id = department.id'
            );
            tableMaker(role);
            break;


        case "View all employees":
            employee = await client.query(
                'SELECT employee.id, employee.first_name, employee.last_name, role.title, department.name AS department, role.salary, CONCAT(manager.first_name, " ", manager.last_name) AS manager FROM employee LEFT JOIN role ON employee.role_id = role.id LEFT JOIN department ON role.department_id = department.id LEFT JOIN employee manager ON employee.manager_id = manager.id'
            );
            tableMaker(employee);
            break;


        case "Add a department":
            department = await inquirer.prompt([
                {
                    type: "input",
                    message: "What is the name of the department?",
                    name: "name",
                },
            ]);
            await client.query(`INSERT INTO department (name) VALUES ('${department.name.trim()}')`, [department.name]);
            console.log(`${department.name} has been added to the database`);
            break;


        case "Delete a department":
            departments = await getDepartments(client);
            const deleteDepartment = await inquirer.prompt([
                {
                    type: "list",
                    message: "Which department would you like to delete?",
                    choices: departments,
                    name: "department",
                },
            ]);
            await client.query(`DELETE FROM department WHERE name = '${deleteDepartment.department}'`);
            console.log(`${deleteDepartment.department} has been deleted from the database`);
            break;


        case "Add a role":
            departments = await getDepartments(client);
            role = await inquirer.prompt([
                {
                    type: "input",
                    message: "What is the title of the role?",
                    name: "title",
                },
                {
                    type: "input",
                    message: "What is the salary of the role?",
                    name: "salary",
                },
                {
                    type: "list",
                    message: "Which department does this role belong to?",
                    choices: departments,
                    name: "department",
                },
            ]);
            roleId = await client.query(`SELECT id FROM department WHERE name = '${role.department}'`);
            await client.query(`INSERT INTO role (title, salary, department_id) VALUES ('${role.title}', ${role.salary}, ${roleId.rows[0].id})`, [role.title, role.salary, roleId.rows[0].id]);
            console.log(`${role.title} has been added to the database`);
            break;


        case "Delete a role":
            roles = await getRoles(client);
            const deleteRole = await inquirer.prompt([
                {
                    type: "list",
                    message: "Which role would you like to delete?",
                    choices: roles,
                    name: "role",
                },
            ]);
            await client.query(`DELETE FROM role WHERE title = '${deleteRole.role}'`);
            console.log(`${deleteRole.role} has been deleted from the database`);
            break;

        case "Add an employee":
            roles = await getRoles(client);
            employees = await getEmployees(client);
            employee = await inquirer.prompt([
                {
                    type: "input",
                    message: "What is the employee's first name?",
                    name: "first_name",
                },
                {
                    type: "input",
                    message: "What is the employee's last name?",
                    name: "last_name",
                },
                {
                    type: "list",
                    message: "What is the employee's role?",
                    choices: roles,
                    name: "role",
                },
                {
                    type: "list",
                    message: "Who is the employee's manager?",
                    choices: employees,
                    name: "manager",
                },
            ]);
            roleId = await client.query(`SELECT id FROM role WHERE title = '${employee.role}'`);
            let managerId;
            if (employee.manager === "None") {
                managerId = null;
            } else {
                managerId = await client.query(`SELECT id FROM employee WHERE CONCAT(first_name, " ", last_name) = '${employee.manager}'`);
            }
            await client.query(`INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ('${employee.first_name}', '${employee.last_name}', ${roleId.rows[0].id}, ${managerId ? managerId.rows[0].id : null})`, [employee.first_name, employee.last_name, roleId.rows[0].id, managerId ? managerId.rows[0].id : null]);
            console.log(`${employee.first_name} ${employee.last_name} has been added to the database`);
            break;


        case "Delete an employee":
            employees = await getEmployees(client);
            const deleteEmployee = await inquirer.prompt([
                {
                    type: "list",
                    message: "Which employee would you like to delete?",
                    choices: employees,
                    name: "employee",
                },
            ]);
            await client.query(`DELETE FROM employee WHERE CONCAT(first_name, " ", last_name) = '${deleteEmployee.employee}'`);
            console.log(`${deleteEmployee.employee} has been deleted from the database`);
            break;


        case "Update an employee role":
            employees = await getEmployees(client);
            roles = await getRoles(client);
            const updateEmployee = await inquirer.prompt([
                {
                    type: "list",
                    message: "Which employee would you like to update?",
                    choices: employees,
                    name: "employee",
                },
                {
                    type: "list",
                    message: "What is the employee's new role?",
                    choices: roles,
                    name: "role",
                },
            ]);
            roleId = await client.query(`SELECT id FROM role WHERE title = '${updateEmployee.role}'`);
            await client.query(`UPDATE employee SET role_id = ${roleId.rows[0].id} WHERE CONCAT(first_name, " ", last_name) = '${updateEmployee.employee}'`);
            console.log(`${updateEmployee.employee}'s role has been updated to ${updateEmployee.role}`);
            break;


        default:
            console.log("Invalid option");
            break;
    }
}

async function getEmployees(client, empty) {
    let employees = await client.query('SELECT CONCAT(first_name, " ", last_name) AS name FROM employee');
    employees = employees.rows.map((employee) => employee.concat);
    if (empty) {
        employees.unshift("None");
    }
    return employees;
    };

async function getRoles(client) {
    let roles = await client.query('SELECT title FROM role');
    roles = roles.rows.map((role) => role.title);
    return roles;
    };

async function getRoleId(client, role) {
    let roleId = await client.query(`SELECT id FROM role WHERE title = '${role}'`);
    roleId = roleId.rows[0].id;
    return roleId;
    };

async function getDepartments(client) {
    let departments = await client.query('SELECT department.name FROM department');
    departments = departments.rows.map((row) => row.name);
    return departments;
    };

async function getManagerId(client, manager) {
    let managerId = await client.query(`SELECT id FROM employee WHERE CONCAT(first_name, " ", last_name) = '${manager}'`);
    managerId = managerId.rowCount > 0 ? managerId.rows[0].id : null;
    return managerId;
    };

module.exports = pgQuery;