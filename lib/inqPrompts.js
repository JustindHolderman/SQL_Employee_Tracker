const inquirer = require("inquirer");

const client = require("./config/connection");
const pgQuery = require("./utils/pgQuery");
const { start } = require("repl");

module.exports = {
    startApplication: async () => {

        await client.connect();
        console.log("Connected to database");

        let startPoint = 1;

        while (startPoint === 1) {
            if (startPoint === 1) {
                await inquirer.createPromptModule([
                    {
                        type: "list",
                        message: "What would you like to do?",
                        choices: [
                            "View all departments",
                            "View all roles",
                            "View all employees",
                            "Add a department",
                            "Delete a department",
                            "Add a role",
                            "Delete a role",
                            "Add an employee",
                            "Delete an employee",
                            "Update an employee role",
                            "Quit"
                        ],
                        name: "selected",
                    },
                ])
                .then(async (option) => {
                    if (option.selected === "Quit") {
                        await client.end();
                        return startPoint = 0;
                    } else {
                        await pgQuery(option.selected, client);
                    }
                    });
                }
            }
            console.log("Application has ended");
        }};