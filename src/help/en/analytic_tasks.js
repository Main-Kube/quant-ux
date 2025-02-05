export let texts = [
    {
        "id": "analytics.tasks",
        "name":"Analytic Tasks",
        "title": "Analytics Tasks",
        "body": `
            Tasks are defined as a sequence of interactions that the users have to perform.
            Analytic tasks allow you to measure how long and how many clicks users need for the execution.
            <br>
        `,
        "video": {
            "src": "https://www.youtube.com/embed/eGDTAJlB-uI?t=64"
        },
        "paragraphs": [
                {
                    "id": "analytics.tasks.kpi",
                    "title": "Task KPIs",
                    "css": "",
                    "body": `
                        Once the task flow is defined the task list will updated and show the several KPIs. These KPIs
                        allow to get a first understanding, if the testers behavior is inline with your expections.

                        <p class="MatcHelpExample">
                            <b>Example</b>: You have created a new design for a shopping app, and you 
                            are interested how the design works. You ran some tests and see now that
                            the users took in average 2:30min. This is much more than expected, so you should
                            do a deep dive and check out the detailed statistics to find if there only some
                            users that have issues and skew the KPIs, or if there is a general problem.
                        </p>

                    `
                },
                {
                    "id": "analytics.tasks.start",
                    "title": "Start",
                    "body": `
                        The start rate tells you how many users were able to start a given task. 
                        <p class="MatcHelpExample">
                            <b>Example</b>: Let's assume you have a prototype with three screens. A, B and C. A is wired to B, 
                            and B is wired to C. Also, you have defined a task, that measures if users go from B to C. 
                            If a tester views only screen A, this test session is not counted as started. If the 
                            tester visits A and B, the session is counted as started. 
                        </p>
                        A low start rate, indicates that the users have issues navigating in you design. They were not able 
                        to navigate to the teh right screen. 
                    `
                },
                {
                    "id": "analytics.tasks.success",
                    "title": "Success",
                    "body": `
                        The success rate tells you how many users were able to 
                        complete a given task once the have <b>started</b>.

                        <div class="MatcHelpExample">
                            <b>Example</b>: We continue with the example outlines above. Let's assume 
                            we have there testers. Tester X visits only
                            A, tester Y visits A, and B and tester Z visits A, B and C. In this case the 
                            start rate would be 2 / 3, because tester Y and Z managed 
                            to visit screen B. The total number of success is however only 1, since
                            only tester Z managed to visit screen C. The success rate is thus 1 / 2.
                        </div>

                        In general, you want all users to understand your design and are able to complete
                        the task. Hence, the higher the success rate, the better your design.
                    `
                },
                {
                    "id": "analytics.tasks.duration",
                    "title": "Duration",
                    "body": `
                        The task duration measures the average / mean time the users take to complete a task.
                        Most of the times short durations indicate that the users understood your design.
                        
                        <div class="MatcHelpExample">
                            <b>Example</b>: We continue with the example outlines above. Let's assume 
                            we have 4 testers that have completed the task. They took 10s, 12s, 10s
                            and 28s. In the case the mean duration would 
                            be (10 + 12 + 10 + 28) = 60s divided by 4, so 15s.
                        </div>

                        Please be aware that often duration times <b>vary</b> a lot between the individual users. As you
                        could see in the example the first three users were quite fast, whereas the last user
                        was slow.
                        <br>
                        It would in such a case make sense, to review the screen recordings or check the
                        user joureny graphs to understand the users problems. 

                        <p class="MatcHelpCallout">
                           One can click on the <span class="MatcButton mdi mdi-chart-bar"></span> to open a detailed 
                           view on the distribution of the durations in the scatter plot.
                        </p>
                        
                       
                        `
                },
                {
                    "id": "analytics.tasks.clicks",
                    "title": "Interactions",
                    "body": `
                        The task interaction measures the average / mean number of interactions
                        the user need to complete a task.

                        <div class="MatcHelpExample">
                            <b>Example</b>: We continue with the example outlines above. Let's assume 
                            we have 2 testers that have completed the task. They took 5
                            and 15 clicks. In the case the mean interaction would 
                            be (5 +  15) = 20 divided by 2, so 10 clicks.
                        </div>

                        Like the duration, the number of interactions may vary a lot between
                        the individual users. The mean value might hide in such a case outliers,
                        that are interesing for further analysis.

                        <p class="MatcHelpCallout">
                            One can click on the <span class="MatcButton mdi mdi-chart-bar"></span> to review
                            the distribution of the interactions and spot outliers.
                        </p>
                    `
                },
                {
                    "id": "analytic.taks.dialog",
                    "title": "Task Charts",
                    "body": `
                        You can get a deeper insight into the distribution of the duration and interactions by
                        clicking on the <span class="MatcButton mdi mdi-chart-bar"></span> button next to the “Edit Flow” button. 
                        In the dialog, you can switch between scatter plots and box plots.
                        <br><br>
                        <b>Scatter plots</b> show the duration of a task vs the number of interactions and
                        make it easy to spot outliers, for instance user that took an unusual amount
                        of time and clicks. 

                        <p class="MatcHelpCallout">
                            Clicking on a dot in the scatter plot will open the screen recording, so you
                            can easily understand where the testers struggled.
                        </p>

                        <b>Box plots</b> show also the duration and interaction, but in a condesed way. 
                        They visualize the distribution and skewnesshe of the data, by showing
                        the average and 75% quartiles.

                      
                    `
                }
            ]
    }
]