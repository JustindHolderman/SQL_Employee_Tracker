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
            role = await client.query('SELECT role.id, role.title, department.name AS department, role.salary FROM role LEFT JOIN department ON role.department_id = department.id;');
            tableMaker(role);
            break;


        case "View all employees":
            employee = await client.query('SELECT employee.id, employee.first_name, employee.last_name, role.title, department.name AS department, role.salary, CONCAT(manager.first_name, manager.last_name) AS manager FROM employee LEFT JOIN role ON employee.role_id = role.id LEFT JOIN department ON role.department_id = department.id LEFT JOIN employee manager ON employee.manager_id = manager.id;');
            tableMaker(employee);
            break;


        case "Add new department":
            department = await inquirer.prompt([
                    {
                        type: "input",
                        message: "What is the name of the department?",
                        name: "name",
                    },
                ]);
            
            const query = 'INSERT INTO department (name) VALUES ($1)';
            const values = [department.name.trim()];
            
                try {
                    await client.query(query, values);
                    console.log(`${department.name} has been added to the database`);
                } catch (error) {
                    console.error('Error adding department:', error);
                }
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


        case "Add new role":
            try {
                const departments = await getDepartments(client);
                const role = await inquirer.prompt([
                    {
                        type: "input",
                        message: "What is the title of the role?",
                        name: "title",
                    },
                    {
                        type: "input",
                        message: "What is the salary of the role?",
                        name: "salary",
                        validate: (input) => !isNaN(parseFloat(input)) && isFinite(input) ? true : 'Please enter a valid number for salary.',
                    },
                    {
                        type: "list",
                        message: "Which department does this role belong to?",
                        choices: departments,
                        name: "department",
                    },
                    ]);
            
                const deptQuery = 'SELECT id FROM department WHERE name = $1';
                const deptValues = [role.department];
                const deptResult = await client.query(deptQuery, deptValues);
            
                    if (deptResult.rows.length === 0) {
                        throw new Error('Department not found.');
                    }
            
                const departmentId = deptResult.rows[0].id;
            
                const roleQuery = 'INSERT INTO role (title, salary, department_id) VALUES ($1, $2, $3)';
                const roleValues = [role.title, parseFloat(role.salary), departmentId];
                await client.query(roleQuery, roleValues);
            
                    console.log(`${role.title} has been added to the database`);
            
                } catch (error) {
                    console.error('Error adding role:', error);
                }
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

            case "Add new employee":
                try {
                    const roles = await getRoles(client);
                    const employees = await getEmployees(client);
                    const managers = await getManagers(client);
                    const employee = await inquirer.prompt([
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
                            choices: [...managers, "None"],
                            name: "manager",
                        },
                    ]);
            
                    const roleQuery = 'SELECT id FROM role WHERE title = $1';
                    const roleValues = [employee.role];
                    const roleResult = await client.query(roleQuery, roleValues);
            
                    if (roleResult.rows.length === 0) {
                        throw new Error('Role not found.');
                    }
            
                    const roleId = roleResult.rows[0].id;
            
                    let managerId = null;
                    if (employee.manager !== "None") {
                        const managerQuery = 'SELECT id FROM employee WHERE CONCAT(first_name, \' \', last_name) = $1';
                        const managerValues = [employee.manager];
                        const managerResult = await client.query(managerQuery, managerValues);
            
                        if (managerResult.rows.length === 0) {
                            throw new Error('Manager not found.');
                        }
            
                        managerId = managerResult.rows[0].id;
                    }
            
                    const insertQuery = 'INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ($1, $2, $3, $4)';
                    const insertValues = [employee.first_name, employee.last_name, roleId, managerId];
                    await client.query(insertQuery, insertValues);
            
                    console.log(`${employee.first_name} ${employee.last_name} has been added to the database`);
                } catch (error) {
                    console.error('Error adding employee:', error);
                }
                break;
            
            


                case "Delete an employee":
                    try {
                        const employees = await getEmployees(client);
                        const deleteEmployee = await inquirer.prompt([
                            {
                                type: "list",
                                message: "Which employee would you like to delete?",
                                choices: employees,
                                name: "employee",
                            },
                        ]);
                
                        console.log(`Selected employee for deletion: ${deleteEmployee.employee}`);
                
                        const [firstName, lastName] = deleteEmployee.employee.split(" ");
                        const deleteQuery = 'DELETE FROM employee WHERE first_name = $1 AND last_name = $2';
                        const deleteValues = [firstName, lastName];
                
                        const result = await client.query(deleteQuery, deleteValues);
                
                        if (result.rowCount === 0) {
                            console.log(`No employee found with name: ${deleteEmployee.employee}`);
                        } else {
                            console.log(`${deleteEmployee.employee} has been deleted from the database`);
                        }
                    } catch (error) {
                        console.error('Error deleting employee:', error);
                    }
                    break;
                


                    case "Update employee role":
                        try {
                            // Fetch lists of employees and roles
                            const employees = await getEmployees(client);
                            const roles = await getRoles(client);
                    
                            // Prompt user for employee and new role
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
                    
                            // Extract first name and last name from the selected employee
                            const [firstName, lastName] = updateEmployee.employee.split(" ");
                            console.log(`Updating role for employee: ${firstName} ${lastName}`);
                    
                            // Get the role ID for the new role
                            const roleQuery = 'SELECT id FROM role WHERE title = $1';
                            const roleValues = [updateEmployee.role];
                            const roleResult = await client.query(roleQuery, roleValues);
                    
                            if (roleResult.rows.length === 0) {
                                throw new Error('Role not found.');
                            }
                    
                            const roleId = roleResult.rows[0].id;
                            console.log(`New role ID for '${updateEmployee.role}': ${roleId}`);
                    
                            // Update the employee's role
                            const updateQuery = 'UPDATE employee SET role_id = $1 WHERE first_name = $2 AND last_name = $3';
                            const updateValues = [roleId, firstName, lastName];
                            const result = await client.query(updateQuery, updateValues);
                    
                            if (result.rowCount === 0) {
                                console.log(`No employee found with name: ${updateEmployee.employee}`);
                            } else {
                                console.log(`${updateEmployee.employee}'s role has been updated to ${updateEmployee.role}`);
                            }
                        } catch (error) {
                            console.error('Error updating employee role:', error);
                        }
                        break;
                                        

    }
}

async function getEmployees(client) {
    try {
        const result = await client.query('SELECT CONCAT(first_name, \' \', last_name) AS full_name FROM employee');
        return result.rows.map(row => row.full_name);
    } catch (error) {
        console.error('Error fetching employees:', error);
        throw error;
    }
}
async function getManagers(client) {
    try {
        const result = await client.query('SELECT CONCAT(first_name, \' \', last_name) AS full_name FROM employee WHERE manager_id IS NOT NULL');
        return result.rows.map(row => row.full_name);
    } catch (error) {
        console.error('Error fetching managers:', error);
        throw error;
    }
}

    async function getRoles(client) {
        try {
            const result = await client.query('SELECT title FROM role');
            return result.rows.map(row => row.title);
        } catch (error) {
            console.error('Error fetching roles:', error);
            throw error;
        }
    }


async function getDepartments(client) {
    let departments = await client.query('SELECT department.name FROM department');
    departments = departments.rows.map((row) => row.name);
    return departments;
    };


module.exports = pgQuery;