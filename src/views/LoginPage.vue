<template>
    <div class="MatcLoginPage MatcSimulatorSplash MactMainGradient">
        <div class="MatcLoginPageContainer" v-if="isQuxAuth">
             <div class="MatcToolbarTabs MatcToolbarTabsBig">
                   <a :class="{'MatcToolbarTabActive': tab === 'login'}" @click="tab = 'login'">Login</a>
                   <a :class="{'MatcToolbarTabActive': tab === 'signup'}" @click="tab = 'signup'">Sign Up</a>
             </div>
            <div v-if="tab === 'login'">
                <div class=" form-group">
                    <label class="">Email</label>
                    <input class=" form-control input-lg" placeholder="Your email" type="text" v-model="email">
                </div>

                <div class=" form-group has-feedback">
                    <label class="">Password</label>
                    <input class=" form-control input-lg" placeholder="Your password" type="password" v-model="password" @keyup.enter="login">
                </div>
                <div class="MatcButtonBar">
                    <a class=" MatcButton" @click="login">Login</a>
                    <span class="MatcErrorLabel" v-if="errorMessage">{{errorMessage}}</span>
                </div>
            </div>

            <div v-if="tab == 'signup'">
                <div class=" form-group">
                    <label class="">Email</label>
                    <input class=" form-control input-lg" placeholder="Your email" type="text" v-model="email">
                </div>

                <div class=" form-group has-feedback">
                    <label class="">Password</label>
                    <input class=" form-control input-lg" placeholder="Your password" type="password" v-model="password" @keyup.enter="signup">
                </div>
                <div class="MatcButtonBar">
                    <a class=" MatcButton" @click="signup">SignUp</a>
                    <span class="MatcErrorLabel" v-if="errorMessage">{{errorMessage}}</span>
                </div>
            </div>
        </div>
    </div>
</template>
<script>

import Services from 'services/Services'
//import initKeyCloak from '../sso.js'
import Logger from 'common/Logger'


export default {
  name: "Header",
  mixins: [],
  props: ['user'],
  data: function() {
    return {
        email: '',
        password: '',
        errorMessage: '',
        tab: 'login'
    }
  },
  computed: {
    isQuxAuth () {
        return Services.getConfig().auth !== 'keycloak'
    }
  },
  watch: {
    'user' (v) {
      this.logger.log(6, 'watch', 'user >> ' + v.email)
      this.user = v
    }
  },
  components: {
  },
  methods: {
      async login () {
        this.logger.info('login', 'enter ', this.email)
        var result = await Services.getUserService().login({
            email:this.email,
            password: this.password
        })
        if (result.type == "error") {
            this.$root.$emit("Error", "Wrong login credentials")
            this.errorMessage = "Login is wrong"
        } else {
            this.$emit('login', result);
            this.$root.$emit('UserLogin', result)
        }
      },
      async signup() {
        this.logger.info('signup', 'enter ', this.email)

        if (this.password.length < 6) {
            this.$root.$emit("Error", "Password requires 6 characters")
            this.errorMessage = "Password too short"
            return;
        }

        var result = await Services.getUserService().signup({
            email:this.email,
            password: this.password,
            tos: true
        })
        if (result.type == "error") {
            if (result.errors.indexOf("user.email.not.unique") >= 0) {
                this.$root.$emit("Error", "Email is taken")
                this.errorMessage = "Email is taken"
            } else {
                this.$root.$emit("Error", "Password to short")
                this.errorMessage = "Password too short"
            }
        } else {
            let user = await Services.getUserService().login({
                email:this.email,
                password: this.password,
            })
            this.$emit('login', user);
            this.$root.$emit('UserLogin', user)
            this.logger.log(-1,'signup', 'exit with login', this.email)
        }
      },
      initKeyCloak (conf) {
          // getthe user service!
        const keycloakService = Services.getUserService()
        keycloakService.init(conf)
        // - init should return a promise if this is ok
        // - emit the login
        //initKeyCloak()
      }
  },
  async mounted() {
    this.logger = new Logger('LoginPage')
   
  }
}
</script>

