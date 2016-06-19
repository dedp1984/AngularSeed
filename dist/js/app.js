'use strict';

// Declare app level module which depends on views, and components
angular.module('app', [
    'ngCookies',
    'ngSanitize',
    'ngMessages',
    'lumx',
    'ui.router',
    'restangular',
    'ui.bootstrap',
    'fast',
    'toaster',
    'pu.system',
    'pu.access',
    'pu.utils',
    'pu.question'
])

angular.module('app')
    .run(
    ['$rootScope', '$state', '$stateParams', '$cacheFactory', 'AuthService',
        function ($rootScope, $state, $stateParams, $cacheFactory, AuthService) {
            $rootScope.$state = $state;
            $rootScope.$stateParams = $stateParams;
            $rootScope.cache = $cacheFactory('$rootScope');
            $rootScope.resetCache = function () {
                $rootScope.paginationInfo = {
                    totalItem: 0,
                    pageSize: 20,
                    curPage: 1,
                    maxSize: 5
                };
                $rootScope.vm = {};
            };
            $rootScope.$on("$stateChangeSuccess", function (event, toState, toParams, fromState, fromParams) {
                var data = {};
                data.paginationInfo = $rootScope.paginationInfo;
                data.vm = $rootScope.vm;
                $rootScope.cache.put(fromState.name, data);
                $rootScope.cache.put("previousStateName", fromState.name);
                if ($rootScope.stateConvertType != "toback") {
                    $rootScope.resetCache();
                }
                $rootScope.stateConvertType = "";
            });
            $rootScope.$on("$stateChangeStart", function (event, toState, toParams, fromState, fromParams) {
                console.log("stateChangeStart");
            });
            $rootScope.back = function () {
                var previousStateName = $rootScope.cache.get("previousStateName");
                var data = $rootScope.cache.get(previousStateName);
                $rootScope.paginationInfo = data.paginationInfo;
                $rootScope.vm = data.vm;
                $rootScope.stateConvertType = "toback";
                $state.go(previousStateName);
            };
            $rootScope.hasPrimission = function (resourceId) {
                return AuthService.hasAuthResource(resourceId);
            };
            $rootScope.resetCache();
            // AuthService.initUserInfo();
        }
    ]
)
angular.module('app')
    .factory('AuthRestangular', ['Restangular', 'modal', function (Restangular, modal) {
        return Restangular.withConfig(function (RestangularConfigurer) {
            RestangularConfigurer.setBaseUrl('http://127.0.0.1:8080/rsgl/');
            RestangularConfigurer.setErrorInterceptor(function (response, deferred, responseHandler) {
                modal.error("系统错误，请重试");

            });
        });
    }])
    .factory('CarCreditRestangular', ['Restangular', '$state', 'modal', '$rootScope', '$injector', function (Restangular, $state, modal, $rootScope, $injector) {
        return Restangular.withConfig(function (RestangularConfigurer) {

            RestangularConfigurer.setBaseUrl('http://127.0.0.1:8080/rsgl/api');
            RestangularConfigurer.setFullRequestInterceptor(function (element, operation, route, url, headers, params, httpConfig) {
                if (operation == 'getList') {
                    params.pageSize = params.pageSize || $rootScope.paginationInfo.pageSize;
                    params.curPage = params.curPage || $rootScope.paginationInfo.curPage;
                    angular.extend($rootScope.vm, params);
                }
                return {
                    headers: {
                        'Authorization': window.localStorage.Authorization
                    },
                    params: $rootScope.vm
                };
            });
            RestangularConfigurer.setErrorInterceptor(function (response, deferred, responseHandler) {
                var AuthService = $injector.get('AuthService');
                if (response.status == 401) {
                    if (AuthService.isAuth()) {
                        AuthService.reLogin();
                    } else {
                        modal.error("未授权操作，请重新登陆");
                        $state.go('access.signin');
                    }

                } else {
                    modal.error("系统错误，请重试");
                }
                ;
            });
            RestangularConfigurer.addResponseInterceptor(function (data, operation, what, url, response, deferred) {
                if (data.successResponse == false) {
                    modal.error(data.message);
                    return deferred.reject();
                } else {
                    if (operation == 'getList') {
                        if (angular.isArray(data)) {
                            return data;
                        } else {
                            //如果为getList操作返回的不是Array对象则为翻页数据需特殊处理
                            $rootScope.paginationInfo.totalItem = data.totalItem;
                            return data.data;
                        }
                    } else {
                        return data;
                    }
                }
            });
        });
    }])
    .factory('QuestionRestangular',function(CarCreditRestangular){
        return CarCreditRestangular.withConfig(function(RestangularConfigurer){
            RestangularConfigurer.setBaseUrl('http://127.0.0.1:8080/rsgl/');
        })
    })


angular.module("app")
    .config(
    ['$stateProvider', '$urlRouterProvider',
        function ($stateProvider,   $urlRouterProvider) {
            $urlRouterProvider
                .otherwise('/access/signin');
            $stateProvider
                .state('app', {
                    abstract: true,
                    url: '/app',
                    templateUrl: 'app.html'
                })
                .state('app.index', {
                    url: '/index',
                    templateUrl: 'blank.html'
                })
        }
    ]
);

angular.module("app")
    .controller("AppController", function ($scope,$window, AuthService, $rootScope, modal) {

        var isIE = !!navigator.userAgent.match(/MSIE/i);
        isIE && angular.element($window.document.body).addClass('ie');
        isSmartDevice($window) && angular.element($window.document.body).addClass('smart');

        function isSmartDevice($window) {
            // Adapted from http://www.detectmobilebrowsers.com
            var ua = $window['navigator']['userAgent'] || $window['navigator']['vendor'] || $window['opera'];
            // Checks for iOs, Android, Blackberry, Opera Mini, and Windows mobile devices
            return (/iPhone|iPod|iPad|Silk|Android|BlackBerry|Opera Mini|IEMobile/).test(ua);
        }

        $scope.signup = function () {
            modal.confirm("操作提醒", "确认登出系统？").then(function () {
                AuthService.signup();
                $rootScope.$state.go("access.signin");
            })
        }
    })

angular.module('pu.access',
    [
        'pu.access.services',
        'pu.access.controllers',
        'pu.access.directives'
    ]);
angular.module('pu.access.services', []);
angular.module('pu.access.controllers', []);
angular.module('pu.access.directives', []);

'use strict';

/**
 * Config for the router
 */
angular.module('app')
    .config(
    ['$stateProvider', '$urlRouterProvider',
        function ($stateProvider, $urlRouterProvider) {
            $stateProvider
                .state('access', {
                    url: '/access',
                    template: '<div ui-view class="fade-in-right-big smooth"></div>'
                })
                //登陆系统
                .state('access.signin', {
                    url: '/signin',
                    templateUrl: 'module_access/tpl/signin.html',
                    controller: 'SigninFormController',
                    onEnter: function () {
                        window.localStorage.removeItem('Authorization');
                    }
                })
                //登出操作
                .state('access.signup', {
                    url: '/signup',
                    templateUrl: 'module_access/tpl/page_signup.html',
                    controller: 'SignupFormController'
                })
                //登陆修改弱密码
                .state('access.modifyweakpasswd', {
                    url: '/modifyweakpasswd',
                    templateUrl: 'module_access/tpl/modifyweakpasswd.html',
                    controller: 'ModifyPasswdController'
                })
                //用户自行修改密码
                .state('access.modifypasswd', {
                    url: '/modifypasswd',
                    templateUrl: 'module_access/tpl/modifypasswd.html',
                    controller: 'ModifyPasswdController'
                })
        }
    ]
);
angular.module('pu.question', ['pu.question.services', 'pu.question.controllers']);
angular.module('pu.question.services', []);
angular.module('pu.question.controllers', []);

'use strict';

/**
 * Config for the router
 */
angular.module('app')
    .config(
    ['$stateProvider', '$urlRouterProvider',
        function ($stateProvider, $urlRouterProvider) {
            $stateProvider
                .state('app.question', {
                    url: '/question',
                    abstract: true,
                    template: '<div ui-view class="fade-in-right-big smooth"></div>'
                })
                //调查部门管理
                .state('app.question.dept', {
                    url: '/dept/list',
                    templateUrl: 'module_question/tpl/detp-list.html',
                    controller: 'DeptController'
                })
                .state('app.question.template', {
                    url: '/template',
                    abstract: true,
                    template: '<div ui-view class="fade-in-right-big smooth"></div>',
                    controller: 'TemplateController'
                })
                .state('app.question.template.list', {
                    url: '/list',
                    templateUrl: 'module_question/tpl/template-list.html'
                })
                .state('app.question.template.add', {
                    url: '/add',
                    templateUrl: 'module_question/tpl/template-add.html'
                })
                .state('app.question.template.edit', {
                    url: '/edit',
                    templateUrl: 'module_question/tpl/template-edit.html'
                })
                .state('app.question.activity', {
                    url: '/activity',
                    abstract: true,
                    template: '<div ui-view class="fade-in-right-big smooth"></div>',
                    controller: 'ActivityController'
                })
                .state('app.question.activity.list', {
                    url: '/list',
                    templateUrl: 'module_question/tpl/activity-list.html'
                })
                .state('app.question.activity.add', {
                    url: '/add',
                    templateUrl: 'module_question/tpl/activity-add.html'
                })
                .state('app.question.activity.edit', {
                    url: '/edit',
                    templateUrl: 'module_question/tpl/activity-edit.html'
                })
                .state('app.question.activity.showscore',{
                    url:'/showscore',
                    templateUrl:'module_question/tpl/activity-score.html'
                })
                .state('question', {
                    url: '/question',
                    abstract: true,
                    template: '<div ui-view class="fade-in-right-big smooth"></div>',
                    controller: 'QuestionController'
                })
                .state('question.index',{
                    url:'/index',
                    templateUrl:'module_question/tpl/question-index.html'
                })
                .state('question.selectactivity', {
                    url: '/selectactivity',
                    templateUrl: 'module_question/tpl/question-selectactivity.html'
                })
                .state('question.selectdept', {
                    url: '/selectdept',
                    templateUrl: 'module_question/tpl/question-selectdept.html'
                })
                .state('question.enterdata', {
                    url: '/enterdata',
                    templateUrl: 'module_question/tpl/question-enterdata.html'
                })
        }
    ]
);
angular.module("pu.system",
    [
        'pu.system.services',
        'pu.system.controllers'
    ]);
angular.module('pu.system.services',[]);
angular.module('pu.system.controllers',[]);

'use strict';

/**
 * Config for the router
 */
angular.module('app')
    .config(
    ['$stateProvider',
        function ($stateProvider) {
            $stateProvider
                //用户管理
                .state('app.sysaccounts', {
                    abstract: true,
                    url: '/sysaccounts',
                    template: '<div ui-view=""></div>',
                    controller: 'SysAccountController'
                })
                //用户管理-查询用户列表
                .state('app.sysaccounts.list', {
                    url: '/list',
                    templateUrl: 'module_system/tpl/sysaccount-list.html',
                    controller: function ($scope) {
                        $scope.getAllSysAccounts();
                    }
                })
                //用户管理-增加用户
                .state('app.sysaccounts.add', {
                    url: '/add',
                    templateUrl: 'module_system/tpl/sysaccount-add.html',
                    controller: function ($scope, toaster, CarCreditRestangular) {

                    }
                })
                //用户管理-编辑用户
                .state('app.sysaccounts.detail', {
                    url: '/detail',
                    templateUrl: 'module_system/tpl/sysaccount-detail.html',
                    controller: function ($scope, toaster, CarCreditRestangular) {

                    }
                })
                //经销商管理
                .state('app.sysbranchs', {
                    abstract: true,
                    url: '/sysbranchs',
                    template: '<div ui-view=""></div>',
                    controller: 'SysBranchController'
                })
                //经销商管理-查询经销商列表
                .state('app.sysbranchs.list', {
                    url: '/list',
                    templateUrl: 'module_system/tpl/sysbranch-list.html'
                })
                //经销商管理-增加经销商
                .state('app.sysbranchs.add', {
                    url: '/add',
                    templateUrl: 'module_system/tpl/sysbranch-add.html'
                })
                //经销商管理-编辑经销商
                .state('app.sysbranchs.detail', {
                    url: '/detail/:id',
                    templateUrl: 'module_system/tpl/sysbranch-detail.html'
                })
                //菜单管理
                .state('app.sysmenu', {
                    abstract: true,
                    url: '/sysmenu',
                    template: '<div ui-view=""></div>',
                    controller: 'SysMenuController'
                })
                //菜单管理-查询菜单列表
                .state('app.sysmenu.list', {
                    url: '/list',
                    templateUrl: 'module_system/tpl/sysmenu-list.html',
                    controller: function ($scope) {
                        $scope.getList();
                    }
                })
                .state('app.sysmenu.add', {
                    url: '/add',
                    templateUrl: 'module_system/tpl/sysmenu-add.html'
                })
                .state('app.sysmenu.detail', {
                    url: '/detail',
                    templateUrl: 'module_system/tpl/sysmenu-detail.html'
                })
                .state('app.sysrole', {
                    abstract: true,
                    url: '/sysrole',
                    template: '<div ui-view=""></div>',
                    controller: 'SysRoleController'
                })
                .state('app.sysrole.list', {
                    url: '/list',
                    templateUrl: 'module_system/tpl/sysrole-list.html',
                    controller: function ($scope) {
                        $scope.getList();
                    }
                })
                .state('app.sysrole.add', {
                    url: '/add',
                    templateUrl: 'module_system/tpl/sysrole-add.html'
                })
                .state('app.sysrole.detail', {
                    url: '/detail',
                    templateUrl: 'module_system/tpl/sysrole-detail.html'
                })
                .state('app.sysrole.auth', {
                    url: '/auth',
                    templateUrl: 'module_system/tpl/sysrole-auth.html'
                })
        }
    ]
);
angular.module('pu.utils',
    [
        'pu.utils.services',
        'pu.utils.filters'
    ]);
angular.module('pu.utils.services',[]);
angular.module('pu.utils.filters',[])

'use strict';

/* Controllers */
angular.module('pu.access.controllers')
    .controller('ModifyPasswdController', ['$scope', '$http', '$rootScope', '$state', 'AuthRestangular', 'CarCreditRestangular', 'AuthService',
        function ($scope, $http, $rootScope, $state, AuthRestangular, CarCreditRestangular, AuthService) {
            $scope.user = {};
            $scope.errmsg = null;
            $scope.modifyWeakPasswd = function () {
                AuthService.modifyPasswd($scope.user.oldPasswd, $scope.user.newPasswd).then(function (response) {
                    $state.go('app.index');
                })
            };
            $scope.modifyPasswd = function () {
                AuthService.modifyPasswd($scope.user.oldPasswd, $scope.user.newPasswd).then(function (response) {
                    $state.go('access.signin');
                })
            }

        }])
;
'use strict';

/* Controllers */
// signin controller
angular.module('pu.access.controllers')
    .controller('SigninFormController', ['$scope', '$http', '$rootScope', '$state', 'AuthRestangular', 'CarCreditRestangular', 'AuthService',
        function ($scope, $http, $rootScope, $state, AuthRestangular, CarCreditRestangular, AuthService) {
            $scope.user = {};
            $scope.authError = null;
            $scope.login = function () {
                $scope.authError = null;
                AuthService.login($scope.user.id, $scope.user.passwd).then(function (response) {
                    if (AuthService.isWeakPasswd($scope.user.passwd)) {
                        $state.go('access.modifyweakpasswd');
                    } else {
                        $state.go('app.index');
                    }

                }, function (response) {
                    $scope.authError = response;
                })
            };
        }])
;
'use strict';

// signup controller
angular.module('pu.access.controllers')
    .controller('SignupFormController', ['$scope', '$http', '$state', function ($scope, $http, $state) {
        $scope.user = {};
        $scope.authError = null;
        $scope.signup = function () {
            window.localStorage.removeItem('Authorization');
            $scope.authError = null;
            // Try to create
            $http.post('api/signup', {name: $scope.user.name, email: $scope.user.email, password: $scope.user.password})
                .then(function (response) {
                    if (!response.data.user) {
                        $scope.authError = response;
                    } else {
                        $state.go('app.dashboard-v1');
                    }
                }, function (x) {
                    $scope.authError = 'Server Error';
                });
        };
    }])
;
angular.module('pu.access.directives').directive('confirmPasswd',function(){
    return {
        restrict:'A',
        require:'ngModel',
        link: function ($scope, ele, attrs, ngModelController) {
            $scope.$watch(attrs.ngModel,function(newVal,oldVal){
                if(newVal==oldVal)
                    return;
                var newPasswd=$scope.$eval(attrs.confirmPasswd);
                if(newPasswd!=newVal){
                    ngModelController.$setValidity('valid', false);
                }else{
                    ngModelController.$setValidity('valid', true);
                }
            });
        }
    }
});


angular.module('pu.access.directives')
    .directive('validPasswd', function (AuthService) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function ($scope, ele, attrs, ngModelController) {
                $scope.$watch(attrs.ngModel, function (newVal, oldVal) {
                    if (newVal == oldVal)
                        return;
                    if (AuthService.isWeakPasswd(newVal)) {
                        ngModelController.$setValidity('valid', false);
                    } else {
                        ngModelController.$setValidity('valid', true);
                    }
                });
            }
        }
    });

angular.module('pu.access.services')
    .service('AuthService', ['$rootScope', 'AuthRestangular', '$state', '$q', 'CarCreditRestangular', '$uibModal', 'toaster', function ($rootScope, AuthRestangular, $state, $q, CarCreditRestangular, $uibModal, toaster) {
        var isAuth = false;
        var authResource = {};
        this.login = function (id, passwd) {
            var user = {};
            user.id = id;
            user.passwd = passwd;
            var defered = $q.defer();
            AuthRestangular.all('auth').post(user).then(function (response) {
                if (response.successResponse) {
                    window.localStorage.Authorization = response.data.Authorization;
                    window.localStorage.account = angular.toJson(response.data.account);
                    $rootScope.account = response.data.account;
                    CarCreditRestangular.all('accounts').all("authmenu").all(user.id).getList().then(function (response) {
                        angular.forEach(response, function (item) {
                            authResource[item.routepath] = 'all';
                        })
                        isAuth = true;
                        defered.resolve();
                    });
                }
                else {
                    defered.reject(response.message);
                }
            })
            return defered.promise;
        };
        this.hasAuthResource = function (resourceId) {
            return authResource[resourceId] == 'all';
        };
        this.isAuth = function () {
            return isAuth;
        };
        this.modifyPasswd = function (oldPasswd, newPasswd) {
            var user = {};
            user.accountId = angular.fromJson(window.localStorage.account).id;
            user.oldPasswd = oldPasswd;
            user.newPasswd = newPasswd;
            var defered = $q.defer();
            CarCreditRestangular.all('accounts').all('modifyPasswd').post(user).then(function (response) {
                defered.resolve();
            }, function (response) {
                defered.reject(response.message);
            })
            return defered.promise;
        };
        this.reLogin = function () {
            var $uibModalInstance = $uibModal.open({
                animation: true,
                backdrop: true,
                templateUrl: 'app/login/tpl/dialog-relogin.html',
                controller: function ($scope, AuthService) {
                    $scope.reLogin = function () {
                        AuthService.login($scope.user.accountid, $scope.user.passwd).then(function (response) {
                            $uibModalInstance.close();
                            toaster.pop('success', '操作提醒', '重新登陆成功');
                        }, function (response) {
                            $scope.errmsg = response;
                        })
                    };
                    $scope.cancel = function () {
                        $uibModalInstance.dismiss('cancel');
                    };
                }
            });
        };
        this.isWeakPasswd = function (val) {
            var regx = /^[0-9]+$|^[a-z]+$|^[A-Z]+$/;
            return regx.test(val) || val.length < 8;
        };
        this.signup = function () {
            isAuth = false;
            authResource = {};
            window.localStorage.removeItem("Authorization");
            window.localStorage.removeItem("account");
        };
        this.initUserInfo = function () {
            $rootScope.account = window.localStorage.account;
            CarCreditRestangular.all('accounts').all("authmenu").all($rootScope.account.id).getList().then(function (response) {
                angular.forEach(response, function (item) {
                    authResource[item.routepath] = 'all';
                })
                isAuth = true;
            });
        };
        this.resetPasswd = function (id) {
            var defered = $q.defer();
            CarCreditRestangular.all("accounts").all("resetPasswd").post(id).then(function (response) {
                defered.resolve();
            }, function (response) {
                defered.reject(response.message);
            });
            return defered.promise;
        }
    }]);

'use strict';

/* Controllers */
angular.module("pu.question.controllers")
    .controller("ActivityController",function($scope,CarCreditRestangular,$state,$rootScope,modal,toaster){

        $scope.initList=function(){
            $scope.items=CarCreditRestangular.all("/question/activity").getList().$object;
        };
        $scope.add=function(){
            $scope.depts=CarCreditRestangular.all("/question/dept").getList().$object;
            $scope.tpls=CarCreditRestangular.all("/question/template").getList().$object;
            $scope.activity={};
            $scope.activity.actdepts=[{deptid:'',tplid:''}];
            $state.go("app.question.activity.add");
        };
        $scope.save=function(){
            CarCreditRestangular.all('/question/activity').post($scope.activity).then(function(response){
                toaster.pop('success', '操作提醒', '增加活动成功');
                $rootScope.back();
            })
        };
        $scope.edit=function(item){
            $scope.depts=CarCreditRestangular.all("/question/dept").getList().$object;
            $scope.tpls=CarCreditRestangular.all("/question/template").getList().$object;
            CarCreditRestangular.one('/question/activity',item.id).get().then(function(response){
                $scope.activity=response;
                $state.go('app.question.activity.edit');
            })
        };
        $scope.update=function(){
            modal.confirm('操作确认','确认提交？')
                .then(function(){
                    $scope.activity.save().then(function(response){
                        toaster.pop('success', '操作提醒', '修改活动成功');
                        $state.go("app.question.activity.list");
                    })
                })
        }
        $scope.delete=function(item){
            modal.confirm('操作确认','确认删除？')
                .then(function(){
                    item.remove().then(function(){
                        toaster.pop('success', '操作提醒', '删除活动成功');
                        $state.reload();
                    });

                })
        };
        $scope.addOne=function(index){
            $scope.activity.actdepts.push({deptid:'',tplid:''});
        }
        $scope.delOne=function(index){
            if($scope.activity.actdepts.length==1){
                $scope.activity.actdepts=[{deptid:'',tplid:''}];
            }else{
                $scope.activity.actdepts.splice(index,1);
            }
        };
        $scope.getAcitvityScores=function(item){
            CarCreditRestangular.one("/question/activity/score",item.id).get().then(function(response){
                $scope.scores=response;
                $state.go('app.question.activity.showscore');
            })
        };
        $scope.exportToExcel=function(item){
            CarCreditRestangular.one("/question/excel",item.id).withHttpConfig({responseType: 'arraybuffer'}).get().then(function(response){
                console.log(response);
                var blob = new Blob([response], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
                $scope.saveAs(blob, item.deptname +'-'+$scope.scores.activity.actname+ '.xls');
            });
        };
        $scope.saveAs=function(blob,fileName){
            if (window.navigator.msSaveOrOpenBlob) {
                navigator.msSaveBlob(blob, fileName);
            } else {
                var link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = fileName;
                link.click();
                window.URL.revokeObjectURL(link.href);
            }
        }
    })
;
'use strict';

/* Controllers */
angular.module("pu.question.controllers")
    .controller("DeptController",function($scope,CarCreditRestangular,modal,toaster){
        $scope.initList=function(){
            $scope.items=CarCreditRestangular.all("/question/dept").getList().$object;
        };
        $scope.addDept=function(){
            modal.prompt('增加部门','请输入部门名称').then(function(response){
                    CarCreditRestangular.all('/question/dept').post(response).then(function(response){
                        toaster.pop('success', '操作提醒', '增加部门成功');
                        $scope.initList();
                    })
                })
        };
        $scope.modifyDept=function(item){
            modal.prompt('编辑部门：'+item.deptname,'请输入部门名称')
                .then(function(response){
                    item.deptname=response;
                    item.save().then(function(response){
                        toaster.pop('success', '操作提醒', '修改部门成功');
                        $scope.initList();
                    })
                })
        };
        $scope.deleteDept=function(item){
            modal.confirm('操作确认','确认删除？')
                .then(function(){
                    item.remove().then(function(){
                        toaster.pop('success', '操作提醒', '删除部门成功');
                        $scope.initList();
                    })
                })

        }
    })
;
'use strict';

/* Controllers */
angular.module("pu.question.controllers")
    .controller("QuestionController",function($scope,$rootScope,CarCreditRestangular,QuestionRestangular,$state,$window,modal,toaster){
        $scope.getActivitys=function(){
            QuestionRestangular.all("/answerquestion/activity").getList().then(function(response){
                $scope.activitys=response;
                modal.show('module_question/tpl/question-selectactivity.html',$scope.activitys)
                    .then(function(response){
                        $scope.selectActDept(response.outdata.act);
                    },function(){
                        $rootScope.back();
                    })
            })
        }
        $scope.selectActDept=function(item){
            QuestionRestangular.one("/answerquestion/activity",item.id).get().then(function(response){
                modal.show('module_question/tpl/question-selectdept.html',response.actdepts)
                    .then(function(response){
                        $scope.selectQuestionTpl(response.outdata.dept);
                    },function(){
                        $rootScope.back();
                    })

            });
        };
        $scope.selectQuestionTpl=function(item){
            QuestionRestangular.one('/common').one('/systemDate').get().then(function(response){
               $scope.sysDate=response;
            });
            QuestionRestangular.one('/answerquestion/actdept',item.id).get().then(function(response){
                $scope.actdept=response;
                console.log(response);
                $state.go('question.enterdata');
            });
        };
        $scope.submit=function(){
            $scope.questionRslt=[];
            for(var i=0;i<$scope.actdept.tpl.length;i++){
                var obj={};
                var tpl=$scope.actdept.tpl[i];
                obj.tpldtlid=tpl.id;
                obj.actdeptid=$scope.actdept.id;
                obj.result=tpl.result;
                $scope.questionRslt.push(obj);
            }
            $scope.answer={};
            $scope.answer.result=$scope.questionRslt;
            modal.confirm('操作提醒','确认提交？')
                .then(function(){
                    QuestionRestangular.all('/answerquestion/submit').post($scope.answer).then(function(){
                        modal.info('操作提醒','提交数据成功');
                        $state.go('access.signin');
                    })
                })
        };
    })
;
'use strict';

/* Controllers */
angular.module("pu.question.controllers")
    .controller("TemplateController", function ($scope, CarCreditRestangular, $state,modal,toaster) {
        $scope.sels = [{id: '10', msg: '很好'}, {id: '5', msg: '好'}, {id: '3', msg: '一般'}, {id: '0', msg: '差'}];
        $scope.seltyps=[{id:'1',name:'单项选择题'},{id:'2',name:'填空题'}];
        $scope.initList = function () {
            $scope.items = CarCreditRestangular.all("/question/template").getList().$object;
        };
        $scope.add = function () {
            $scope.tpl = {};
            $scope.tpl.tplDtls = [{showseq: 1, content: '', val: []}];
            $state.go("app.question.template.add");
        };
        $scope.save = function () {
            CarCreditRestangular.all('/question/template').post($scope.tpl).then(function (response) {
                toaster.pop('success', '操作提醒', '增加模板成功');
                $state.go('app.question.template.list');
            })
        };
        $scope.edit = function (item) {
            CarCreditRestangular.one('/question/template', item.id).get().then(function (response) {
                $scope.tpl = response;
                $state.go('app.question.template.edit');
            })
        };
        $scope.update = function () {
            modal.confirm('操作确认','确认提交？')
                .then(function () {
                    $scope.tpl.save().then(function (response) {
                        toaster.pop('success', '操作提醒', '修改模板成功');
                        $state.go("app.question.template.list");
                    })
                })
        }
        $scope.delete = function (item) {
            modal.confirm('操作确认','确认删除？')
                .then(function () {
                    item.remove().then(function () {
                        toaster.pop('success', '操作提醒', '删除模板成功');
                        $state.reload();
                    });

                })
        };
        $scope.addOne = function (index) {
            $scope.tpl.tplDtls.push({showseq: $scope.tpl.tplDtls.length+1, content: '', val: [],type:'1'});
        }
        $scope.delOne = function (index) {
            if ($scope.tpl.tplDtls.length == 1) {
                $scope.tpl.tplDtls = [{showseq: 1, content: '', val: [],type:'1'}];
            } else {
                $scope.tpl.tplDtls.splice(index, 1);
                //重新计算showseq
                for(var idx=0;idx<$scope.tpl.tplDtls.length;idx++){
                    $scope.tpl.tplDtls[idx].showseq=idx+1;
                }
            }
        }
        $scope.addModifyOne = function (index) {
            $scope.tpl.dtls.push({showseq:  $scope.tpl.dtls.length+1, content: '', val: "",type:'1'});
        }
        $scope.delModifyOne = function (index) {
            if ($scope.tpl.dtls.length == 1) {
                $scope.tpl.dtls = [{showseq: 1, content: '', val: "",type:'1'}];
            } else {
                $scope.tpl.dtls.splice(index, 1);
            }
        }
    })
;
'use strict';
// signin controller
angular.module("pu.system.controllers")
    .controller('SysAccountController', ['$scope', '$rootScope', '$state', 'toaster', 'CarCreditRestangular', 'AuthService', 'modal',
        function ($scope, $rootScope, $state, toaster, CarCreditRestangular, AuthService, modal) {
            $scope.getAllSysAccounts = function (params) {
                $scope.items = CarCreditRestangular.all('accounts').getList(params).$object;
            };
            $scope.pageChanged = function () {
                $scope.getAllSysAccounts();
            }
            $scope.save = function () {
                this.item.roles = this.userRoles;
                CarCreditRestangular.all('accounts').post(this.item).then(function () {
                    $state.go('app.sysaccounts.list');
                    toaster.pop('success', '操作提醒', '增加用户成功');
                }, function () {

                })
            };
            $scope.detail = function (id) {
                CarCreditRestangular.one('accounts', id).get().then(function (response) {
                    $scope.item = response;
                    $state.go('app.sysaccounts.detail');
                })
            };
            $scope.modify = function () {
                this.item.roles = this.userRoles;
                $scope.item.save().then(function () {
                    $state.go('app.sysaccounts.list');
                    toaster.pop('success', '操作提醒', '修改用户成功');
                }, function () {

                })
            };
            $scope.delete = function () {
                $scope.item.remove().then(function () {
                    $state.go('app.sysaccounts.list');
                    toaster.pop('success', '操作提醒', '删除用户成功');
                }, function () {

                })
            };
            $scope.getSysBranchList = function () {
                $scope.branchs = CarCreditRestangular.all('branchs').all("list").getList().$object;
            };
            $scope.getAllSysRoles = function () {
                CarCreditRestangular.all('sysroles').getList().then(function (response) {
                    $scope.allSysRoles = response;
                });
            }

            $scope.selectSysRoles = function () {
                for (var i = 0; i < $scope.allSysRoles.length; i++) {
                    var item = $scope.allSysRoles[i];
                    if (item.id == this.sysRole) {
                        $scope.allSysRoles.splice(i, 1);
                        this.userRoles.push(item);
                    }
                }
            }

            $scope.selectUserRoles = function () {
                for (var i = 0; i < this.userRoles.length; i++) {
                    var item = this.userRoles[i];
                    if (item.id == this.userRole) {
                        this.userRoles.splice(i, 1);
                        $scope.allSysRoles.push(item);
                    }
                }
            }

            $scope.initUserRoles = function () {
                $scope.userRoles = [];
                CarCreditRestangular.all('sysroles').getList().then(function (response) {
                    //获取系统所有角色
                    $scope.allSysRoles = response;
                    //对用户的角色进行设置
                    var len = $scope.item.roles.length;
                    for (var i = 0; i < len; i++) {
                        var item = $scope.item.roles[i];
                        $scope.userRoles[i] = {id: item.roleid, rolename: item.rolename};
                        for (var j = 0; j < $scope.allSysRoles.length; j++) {
                            if (item.roleid == $scope.allSysRoles[j].id) {
                                $scope.allSysRoles.splice(j, 1);
                            }
                        }
                    }
                });

            };
            $scope.resetPasswd = function (id) {
                modal.confirm("操作提示", "确认重置用户" + id + "密码？").then(function () {
                    AuthService.resetPasswd(id).then(function (response) {
                        toaster.pop('success', '操作提醒', '重置密码成功');
                    })
                })
            }
        }])
;
'use strict';

/* Controllers */
// signin controller
angular.module("pu.system.controllers")
    .controller('SysBranchController', ['$scope', '$rootScope', '$state', 'toaster', 'CarCreditRestangular', function ($scope, $rootScope, $state, toaster, CarCreditRestangular) {
        $scope.getList = function (params) {
            $scope.items = CarCreditRestangular.all('branchs').getList(params).$object;
        };
        $scope.pageChanged = function () {
            $scope.getList();
        }
        $scope.save = function () {
            CarCreditRestangular.all('branchs').post(this.item).then(function () {
                $state.go('app.sysbranchs.list');
                toaster.pop('success', '操作提醒', '增加经销商成功');
            }, function () {

            })
        };
        $scope.detail = function (id) {
            CarCreditRestangular.one('branchs', id).get().then(function (response) {
                $scope.item = response;
                $state.go('app.sysbranchs.detail');
            })
        };
        $scope.modify = function () {
            $scope.item.save().then(function () {
                $state.go('app.sysbranchs.list');
                toaster.pop('success', '操作提醒', '修改经销商成功');
            }, function () {

            })
        };
        $scope.delete = function () {
            CarCreditRestangular.one("branchs", $scope.selBranch.id).remove().then(function () {
                $scope.getBranchTree();
                toaster.pop('success', '操作提醒', '删除机构成功');
            }, function () {

            })
        };
        $scope.getBranchTree = function () {
            $scope.branchTree = CarCreditRestangular.one("branchs", '0').get().$object;
        };
        $scope.$on("nodeClicked", function (event) {
            $scope.selBranch = event.targetScope.treeData;
            $scope.newBranch = {};
        });
        $scope.add = function () {
            $scope.newBranch.parentid = $scope.selBranch.id;
            CarCreditRestangular.all("branchs").post($scope.newBranch).then(function (response) {
                $scope.getBranchTree();
                toaster.pop('success', '操作提醒', '增加机构成功');
            })
        }


    }])
;
'use strict';

/* Controllers */
// signin controller
angular.module("pu.system.controllers")
    .controller('SysMenuController', ['$scope', '$rootScope', '$state', 'toaster', 'CarCreditRestangular', function ($scope, $rootScope, $state, toaster, CarCreditRestangular) {
        $scope.getList = function (params) {
            CarCreditRestangular.all('menus').getList(params).then(function(response){
                $scope.items =response;
            });
        };
        $scope.pageChanged = function () {
            $scope.getList();
        }
        $scope.save = function () {
            CarCreditRestangular.all('menus').post(this.item).then(function () {
                $state.go('app.sysmenu.list');
                toaster.pop('success', '操作提醒', '增加菜单成功');
            }, function () {

            })
        };
        $scope.detail = function (id) {
            CarCreditRestangular.one('menus', id).get().then(function (response) {
                $scope.item = response;
                $state.go('app.sysmenu.detail');
            })
        };
        $scope.modify = function () {
            $scope.item.save().then(function () {
                $state.go('app.sysmenu.list');
                toaster.pop('success', '操作提醒', '修改菜单成功');
            }, function () {

            })
        };
        $scope.delete = function () {
            $scope.item.remove().then(function () {
                $state.go('app.sysmenu.list');
                toaster.pop('success', '操作提醒', '删除菜单成功');
            }, function () {

            })
        }


    }])
;
'use strict';

/* Controllers */
// signin controller
angular.module("pu.system.controllers").controller('SysRoleController', ['$scope', '$rootScope', '$state', 'toaster', 'CarCreditRestangular', function ($scope, $rootScope, $state, toaster, CarCreditRestangular) {
    $scope.getList = function (params) {
        $scope.items = CarCreditRestangular.all('sysroles').getList(params).$object;
    };
    $scope.pageChanged = function () {
        $scope.getList();
    }
    $scope.save = function () {
        CarCreditRestangular.all('sysroles').post(this.item).then(function () {
            $state.go('app.sysrole.list');
            toaster.pop('success', '操作提醒', '增加角色成功');
        }, function () {

        })
    };
    $scope.detail = function (id) {
        CarCreditRestangular.one('sysroles', id).get().then(function (response) {
            $scope.item = response;
            $state.go('app.sysrole.detail');
        })
    };
    $scope.modify = function () {
        $scope.item.save().then(function () {
            $state.go('app.sysrole.list');
            toaster.pop('success', '操作提醒', '修改角色成功');
        }, function () {

        })
    };
    $scope.delete = function () {
        $scope.item.remove().then(function () {
            $state.go('app.sysrole.list');
            toaster.pop('success', '操作提醒', '删除角色成功');
        }, function () {

        })
    };
    $scope.setauth = function (id) {
        CarCreditRestangular.all('menus').one('rolemenu', id).get().then(function (response) {
            $scope.rolemenu = response;
            $scope.treeData = $scope.rolemenu.menuTree;
            $state.go('app.sysrole.auth');
        })
    };

    $scope.saverolemenu = function () {
        $scope.rolemenu.save().then(function (response) {
            $state.go('app.sysrole.list');
            toaster.pop('success', '操作提醒', '设置角色权限成功');
        })
    }


}])
;
/**
 * Created by dengpan on 2016/4/22.
 */
'use strict';

/* Filters */
// need load the moment.js to use this filter.
angular.module('pu.utils.filters')
    .filter('mysqlDatetime', function() {
        return function(value) {
            if(value==null || angular.isUndefined(value)){
                return '';
            }
            var da = new Date(parseInt(value));
            return da.getFullYear() + "-" + (da.getMonth() + 1) + "-" + da.getDate() + " " + da.getHours() + ":" + da.getMinutes() + ":" + da.getSeconds();
        }
    });
angular.module('pu.utils.services')
    .factory('modal', function ($uibModal) {
        return {
            print: function (scope, templateUrl, size, actionButtons, wintype) {
                var $uibModalInstance = $uibModal.open({
                    animation: true,
                    scope: scope,
                    backdrop: true,
                    templateUrl: 'module_utils/tpl/dialog-print.html',
                    controller: function ($scope) {
                        $scope.templateUrl = templateUrl;
                        $scope.print = function () {
                            window.print();
                            $uibModalInstance.close();
                        };
                        $scope.cancel = function () {
                            $uibModalInstance.dismiss('cancel');
                        };
                        $scope.$on('onClose', function () {
                            console.log('recv close');
                            $uibModalInstance.dismiss('cancel');
                        })
                    },
                    size: size
                });
            },
            error: function (errmsg) {
                var $uibModalInstance = $uibModal.open({
                    animation: true,
                    backdrop: true,
                    resolve: {
                        error: function () {
                            return errmsg;
                        }
                    },
                    templateUrl: 'module_utils/tpl/dialog-error.html',
                    controller: function ($scope, error) {
                        $scope.errmsg = error;
                        $scope.print = function () {
                            window.print();
                        };
                        $scope.cancel = function () {
                            $uibModalInstance.dismiss('cancel');
                        };
                        $scope.$on('onClose', function () {
                            console.log('recv close');
                            $uibModalInstance.dismiss('cancel');
                        })
                    }
                });
            },
            info: function (title, info) {
                var $uibModalInstance = $uibModal.open({
                    animation: true,
                    backdrop: true,
                    resolve: {
                        tips: function () {
                            return info;
                        },
                        title: function () {
                            return title
                        }
                    },
                    templateUrl: 'module_utils/tpl/dialog-info.html',
                    controller: function ($scope, tips, title) {
                        $scope.tips = tips;
                        $scope.title = title;
                        $scope.cancel = function () {
                            $uibModalInstance.dismiss('cancel');
                        };
                        $scope.$on('onClose', function () {
                            console.log('recv close');
                            $uibModalInstance.dismiss('cancel');
                        })
                    }
                });
            },
            confirm: function (title, info) {
                var $uibModalInstance = $uibModal.open({
                    animation: true,
                    backdrop: true,
                    resolve: {
                        tips: function () {
                            return info;
                        },
                        title: function () {
                            return title
                        }
                    },
                    templateUrl: 'module_utils/tpl/dialog-confirm.html',
                    controller: function ($scope, tips, title) {
                        $scope.tips = tips;
                        $scope.title = title;
                        $scope.cancel = function () {
                            $uibModalInstance.dismiss('cancel');
                        };
                        $scope.ok = function () {
                            $uibModalInstance.close();
                        }
                    }
                });
                return $uibModalInstance.result;
            },
            prompt:function(title,placeholder){
                var $uibModalInstance=$uibModal.open({
                    animation: true,
                    backdrop:'false',
                    resolve: {
                        title: function () {
                            return title;
                        },
                        placeholder: function () {
                            return placeholder;
                        }
                    },
                    templateUrl: 'module_utils/tpl/dialog-prompt.html',
                    controller: function($scope,title,placeholder){
                        $scope.title=title;
                        $scope.placeholder=placeholder;
                        $scope.vm={};
                        $scope.ok=function(){
                            $uibModalInstance.close($scope.vm.result);
                        };
                        $scope.cancel = function () {
                            $uibModalInstance.dismiss('cancel');
                        };
                    }
                });
                return $uibModalInstance.result;
            },
            show:function(templateUrl,indata){
                var $uibModalInstance=$uibModal.open({
                    animation: true,
                    backdrop:'false',
                    resolve: {
                        indata: function () {
                            return indata;
                        }
                    },
                    templateUrl: templateUrl,
                    controller: function($scope,indata){
                        $scope.vm={};
                        $scope.vm.indata=indata;
                        $scope.vm.outdata={};
                        $scope.ok=function(){
                            $uibModalInstance.close($scope.vm);
                        };
                        $scope.cancel = function () {
                            $uibModalInstance.dismiss('cancel');
                        };
                    }
                });
                return $uibModalInstance.result;
            }
        }
    })

angular.module("app").run(["$templateCache", function($templateCache) {$templateCache.put("module_access/tpl/dialog-relogin.html","<form name=\"form\" class=\"form-validation form-horizontal\">\r\n    <div class=\"modal-header\">\r\n        <h4 class=\"modal-title\"><i class=\"fa fa-exclamation-circle\"></i>登陆超时请重新登陆</h4>\r\n    </div>\r\n    <div class=\"modal-body\">\r\n        <div class=\"row\">\r\n            <div class=\"col-sm-8 col-sm-offset-2\">\r\n                <div class=\"form-group\">\r\n                    <label class=\"col-lg-3 control-label\">用户名：</label>\r\n                    <div class=\"col-lg-9\">\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"user.accountid\" required >\r\n                    </div>\r\n                </div>\r\n                <div class=\"form-group\">\r\n                    <label class=\"col-lg-3 control-label\">密码：</label>\r\n                    <div class=\"col-lg-9\">\r\n                        <input type=\"password\" class=\"form-control\" ng-model=\"user.passwd\" required >\r\n                    </div>\r\n                </div>\r\n            </div>\r\n        </div>\r\n        <div class=\"text-danger wrapper text-center\" ng-show=\"errmsg\">\r\n            {{errmsg}}\r\n        </div>\r\n    </div>\r\n    <div class=\"modal-footer\">\r\n        <button type=\"submit\" class=\"btn btn-sm btn-success m-r-sm\" ng-disabled=\"form.$invalid\" ng-click=\"reLogin()\">登陆</button>\r\n        <button type=\"button\" class=\"btn btn-sm btn-info\" ng-click=\"cancel()\">关闭</button>\r\n    </div>\r\n</form>");
$templateCache.put("module_access/tpl/modifypasswd.html","\r\n<div class=\"wrapper-md\" ng-controller=\"ModifyPasswdController\">\r\n  <div class=\"row\">\r\n    <div class=\"col-sm-6 col-sm-offset-3\">\r\n      <div class=\"panel panel-default\">\r\n        <div class=\"panel-heading font-bold\">修改密码</div>\r\n        <div class=\"panel-body\">\r\n          <form class=\"bs-example form-horizontal\" name=\"form\">\r\n            <div class=\"form-group\">\r\n              <label class=\"col-lg-3 control-label\">当前密码：</label>\r\n              <div class=\"col-lg-5\">\r\n                <input type=\"password\" class=\"form-control\" ng-model=\"user.oldPasswd\" required >\r\n              </div>\r\n            </div>\r\n            <div class=\"form-group\">\r\n              <label class=\"col-lg-3 control-label\">新的登陆密码：</label>\r\n              <div class=\"col-lg-5\">\r\n                <input name=\"passwd\" type=\"password\" class=\"form-control\" ng-model=\"user.newPasswd\" required valid-passwd=\"\"\r\n                       uib-popover-template=\"app/login/tpl/modifypasswdtips.html\"\r\n                       popover-trigger=\"focus\"\r\n                       popover-placement=\"bottom\">\r\n              </div>\r\n              <div class=\"col-lg-4\">\r\n                <span ng-show=\"form.passwd.$error.valid\">密码必须大于8位，且由大写字母、小写字母、数字组成</span>\r\n              </div>\r\n            </div>\r\n            <div class=\"form-group\">\r\n              <label class=\"col-lg-3 control-label\">确认新的登录密码：</label>\r\n              <div class=\"col-lg-5\">\r\n                <input type=\"password\" name=\"confirmPasswd\" class=\"form-control\" ng-model=\"user.confirmPasswd\" required confirm-passwd=\"user.newPasswd\">\r\n              </div>\r\n              <div class=\"col-lg-4\">\r\n                <span class=\"error\" ng-show=\"form.confirmPasswd.$error.valid\">两次输入密码不一致</span>\r\n              </div>\r\n            </div>\r\n            <div class=\"form-group\">\r\n              <div class=\"col-lg-offset-3 col-lg-8\">\r\n                <button type=\"submit\"  class=\"btn btn-sm btn-primary m-r-md\" ng-disabled=\"form.$invalid\" ng-click=\"modifyPasswd()\">确认修改</button>\r\n                <button type=\"button\"  class=\"btn btn-sm btn-info\" ng-click=\"back()\">返回</button>\r\n              </div>\r\n            </div>\r\n          </form>\r\n        </div>\r\n      </div>\r\n    </div>\r\n  </div>");
$templateCache.put("module_access/tpl/modifypasswdtips.html","<div>\r\n    <div>{{dynamicPopover.content}}</div>\r\n    <div class=\"form-group\">\r\n        <label>Popup Title:</label>\r\n        <input type=\"text\" ng-model=\"dynamicPopover.title\" class=\"form-control\">\r\n    </div>\r\n</div>");
$templateCache.put("module_access/tpl/modifyweakpasswd.html","\r\n<div class=\"wrapper-md\" ng-controller=\"ModifyPasswdController\">\r\n  <div class=\"row\">\r\n    <div class=\"col-sm-6 col-sm-offset-3\">\r\n      <div class=\"panel panel-default\">\r\n        <div class=\"panel-heading font-bold\"><i class=\"fa  fa-warning m-r-sm\"></i>您的密码为弱密码请更改密码</div>\r\n        <div class=\"panel-body\">\r\n          <form class=\"bs-example form-horizontal\" name=\"form\">\r\n            <div class=\"form-group\">\r\n              <label class=\"col-lg-3 control-label\">当前密码：</label>\r\n              <div class=\"col-lg-5\">\r\n                <input type=\"password\" class=\"form-control\" ng-model=\"user.oldPasswd\" required >\r\n              </div>\r\n            </div>\r\n            <div class=\"form-group\">\r\n              <label class=\"col-lg-3 control-label\">新的登陆密码：</label>\r\n              <div class=\"col-lg-5\">\r\n                <input name=\"passwd\" type=\"password\" class=\"form-control\" ng-model=\"user.newPasswd\" required valid-passwd\r\n                       uib-popover-template=\"app/login/tpl/modifypasswdtips.html\"\r\n                       popover-trigger=\"focus\"\r\n                       popover-placement=\"bottom\">\r\n              </div>\r\n              <div class=\"col-lg-4\">\r\n                <span ng-show=\"form.passwd.$error.valid\">密码必须大于8位，且由大写字母、小写字母、数字组成</span>\r\n              </div>\r\n            </div>\r\n            <div class=\"form-group\">\r\n              <label class=\"col-lg-3 control-label\">确认新的登录密码：</label>\r\n              <div class=\"col-lg-5\">\r\n                <input type=\"password\" name=\"confirmPasswd\" class=\"form-control\" ng-model=\"user.confirmPasswd\" required confirm-passwd=\"user.newPasswd\">\r\n              </div>\r\n              <div class=\"col-lg-4\">\r\n                <span class=\"error\" ng-show=\"form.confirmPasswd.$error.valid\">两次输入密码不一致</span>\r\n              </div>\r\n            </div>\r\n            <div class=\"form-group\">\r\n              <div class=\"col-lg-offset-3 col-lg-8\">\r\n                <button type=\"submit\"  class=\"btn btn-sm btn-primary m-r-md\" ng-disabled=\"form.$invalid\" ng-click=\"modifyWeakPasswd()\">确认修改</button>\r\n                <button type=\"button\"  class=\"btn btn-sm btn-info\" ui-sref=\"access.signin\">重新登陆</button>\r\n              </div>\r\n            </div>\r\n          </form>\r\n        </div>\r\n      </div>\r\n    </div>\r\n  </div>");
$templateCache.put("module_access/tpl/signin.html","<div class=\"panel\" style=\"height: 500px;\">\r\n  <div class=\"toolbar\">\r\n    <div class=\"toolbar__left mr++\">\r\n    </div>\r\n    <span class=\"toolbar__label fs-title\">满意度调查管理系统</span>\r\n    <div class=\"toolbar__right\">\r\n        <a href=\"javascript:\" ui-sref=\"question.index\">进入满意度调查</a>\r\n    </div>\r\n  </div>\r\n  <div class=\"has-divider has-divider--dark\"></div>\r\n  <div flex-container=\"row\" flex-column=\"12\">\r\n    <div flex-item=\"8\">\r\n    </div>\r\n    <div flex-item=\"3\">\r\n        <div flex-container=\"column\" class=\"panel mt+++ tc-white-1\">\r\n            <div class=\"m+\">\r\n                <span style=\"color: rgba(0, 0, 0, 0.56);font-size: 20px\"><b><i class=\"mdi mdi-login\"></i>请登陆</b></span>\r\n            </div>\r\n            <div class=\"has-divider has-divider--dark\"></div>\r\n            <form name=\"form\">\r\n                <div flex-container=\"column\" class=\"p+++\" >\r\n                    <lx-text-field lx-label=\"用户名\" lx-valid=\"form.username.$valid\" >\r\n                        <input type=\"text\"  name=\"username\" ng-model=\"user.id\" required>\r\n                    </lx-text-field>\r\n                    <lx-text-field lx-label=\"密码\" lx-valid=\"form.passwd.$valid\">\r\n                        <input type=\"password\" name=\"passwd\" ng-model=\"user.passwd\" required>\r\n                    </lx-text-field>\r\n                    <lx-button lx-color=\"green\" lx-size=\"l\" class=\"mt++\" ng-click=\"login()\"  ng-disabled=\'form.$invalid\'>登陆</lx-button>\r\n                </div>\r\n            </form>\r\n        </div>\r\n    </div>\r\n  </div>\r\n</div>");
$templateCache.put("module_question/tpl/activity-add.html","<div class=\"panel m++\">\n    <div class=\"panel-header\">\n        <div class=\"panel-header-wrapper\">\n            <h2 class=\"panel-header-title\">创建活动</h2>\n        </div>\n    </div>\n    <div class=\"toolbar\">\n        <div class=\"toolbar__left mr++\">\n        </div>\n        <span class=\"toolbar__label fs-title\"></span>\n        <div class=\"toolbar__right\">\n            <lx-button   lx-type=\"flat\" lx-size=\"l\" lx-color=\"green\" ng-click=\"save()\"><i class=\"mdi mdi-content-save\"></i>保存</lx-button>\n            <lx-button   lx-type=\"flat\" lx-size=\"l\" lx-color=\"grey\" ng-click=\"back()\"><i class=\"mdi mdi-keyboard-backspace\"></i>返回</lx-button>\n        </div>\n    </div>\n    <div class=\"has-divider has-divider--dark\"></div>\n\n    <form name=\"form\" class=\"p+\">\n        <div flex-container=\"row\" flex-gutter=\"16\">\n            <div flex-item=\"8\">\n                <lx-text-field   lx-label=\"活动名称\"  lx-allow-clear=\"true\" lx-valid=\"form.actname.$valid\" lx-error=\"form.actname.$invalid\" >\n                    <input type=\"text\" name=\"actname\"  ng-model=\"activity.actname\"  required>\n                </lx-text-field>\n            </div>\n        </div>\n        <div flex-container=\"column\" ng-repeat=\"actdept in activity.actdepts\">\n            <div flex-container=\"row\" flex-column=\"16\" flex-gutter=\"24\" >\n                <div flex-item=\"5\">\n                    <lx-select\n                            name=\"dept\"\n                            ng-model=\"actdept.deptid\"\n                            lx-choices=\"depts\"\n                            lx-allow-clear=\"true\"\n                            lx-label=\"选择调查部门\"\n                            lx-multiple=\"false\"\n                            lx-display-filter=\"true\"\n                            lx-error=\"form.dept.$invalid\"\n                            lx-track-by=\"id\"\n                            required\n                            >\n                        <lx-select-selected required>\n                            {{ $selected.deptname }}\n                        </lx-select-selected>\n\n                        <lx-select-choices>\n                            {{ $choice.deptname }}\n                        </lx-select-choices>\n                    </lx-select>\n                </div>\n                <div flex-item=\"5\">\n                    <lx-select\n                            name=\"template\"\n                            ng-model=\"actdept.tplid\"\n                            lx-choices=\"tpls\"\n                            lx-allow-clear=\"true\"\n                            lx-label=\"调查所用模板\"\n                            lx-multiple=\"false\"\n                            lx-display-filter=\"true\"\n                            lx-error=\"form.template.$invalid\"\n                            lx-track-by=\"id\"\n                            required\n                            >\n                        <lx-select-selected required>\n                            {{ $selected.tplname }}\n                        </lx-select-selected>\n\n                        <lx-select-choices>\n                            {{ $choice.tplname }}\n                        </lx-select-choices>\n                    </lx-select>\n                </div>\n                <div flex-item=\"2\">\n                    <lx-button lx-type=\"fab\" lx-size=\"s\" ng-click=\"addOne($index)\" lx-color=\"grey\" class=\"mt+++\">+</lx-button>\n                    <lx-button lx-type=\"fab\" lx-size=\"s\" ng-click=\"delOne($index)\" lx-color=\"grey\" class=\"mt+++\">-</lx-button>\n                </div>\n            </div>\n        </div>\n    </form>\n</div>");
$templateCache.put("module_question/tpl/activity-edit.html","<div class=\"panel m++\">\n    <div class=\"panel-header\">\n        <div class=\"panel-header-wrapper\">\n            <h2 class=\"panel-header-title\">编辑活动</h2>\n        </div>\n    </div>\n    <div class=\"toolbar\">\n        <div class=\"toolbar__left mr++\">\n        </div>\n        <span class=\"toolbar__label fs-title\"></span>\n        <div class=\"toolbar__right\">\n            <lx-button   lx-type=\"flat\" lx-size=\"l\" lx-color=\"green\" ng-click=\"update()\"><i class=\"mdi mdi-content-save\"></i>保存</lx-button>\n            <lx-button   lx-type=\"flat\" lx-size=\"l\" lx-color=\"grey\" ng-click=\"back()\"><i class=\"mdi mdi-keyboard-backspace\"></i>返回</lx-button>\n        </div>\n    </div>\n    <div class=\"has-divider has-divider--dark\"></div>\n\n    <form name=\"form\" class=\"p+\">\n        <div flex-container=\"row\" flex-gutter=\"16\">\n            <div flex-item=\"8\">\n                <lx-text-field   lx-label=\"活动名称\"  lx-allow-clear=\"true\" lx-valid=\"form.actname.$valid\" lx-error=\"form.actname.$invalid\" >\n                    <input type=\"text\" name=\"actname\"  ng-model=\"activity.actname\"  required>\n                </lx-text-field>\n            </div>\n        </div>\n        <div flex-container=\"column\" ng-repeat=\"actdept in activity.actdepts\">\n            <div flex-container=\"row\" flex-column=\"16\" flex-gutter=\"24\" >\n                <div flex-item=\"5\">\n                    <lx-select\n                            name=\"dept\"\n                            ng-model=\"actdept.deptid\"\n                            lx-choices=\"depts\"\n                            lx-allow-clear=\"true\"\n                            lx-label=\"选择调查部门\"\n                            lx-multiple=\"false\"\n                            lx-display-filter=\"true\"\n                            lx-error=\"form.dept.$invalid\"\n                            lx-track-by=\"id\"\n                            required\n                            >\n                        <lx-select-selected required>\n                            {{ $selected.deptname }}\n                        </lx-select-selected>\n\n                        <lx-select-choices>\n                            {{ $choice.deptname }}\n                        </lx-select-choices>\n                    </lx-select>\n                </div>\n                <div flex-item=\"5\">\n                    <lx-select\n                            name=\"template\"\n                            ng-model=\"actdept.tplid\"\n                            lx-choices=\"tpls\"\n                            lx-allow-clear=\"true\"\n                            lx-label=\"调查所用模板\"\n                            lx-multiple=\"false\"\n                            lx-display-filter=\"true\"\n                            lx-error=\"form.template.$invalid\"\n                            lx-track-by=\"id\"\n                            required\n                            >\n                        <lx-select-selected required>\n                            {{ $selected.tplname }}\n                        </lx-select-selected>\n\n                        <lx-select-choices>\n                            {{ $choice.tplname }}\n                        </lx-select-choices>\n                    </lx-select>\n                </div>\n                <div flex-item=\"2\">\n                    <lx-button lx-type=\"fab\" lx-size=\"s\" ng-click=\"addOne($index)\" lx-color=\"grey\" class=\"mt+++\">+</lx-button>\n                    <lx-button lx-type=\"fab\" lx-size=\"s\" ng-click=\"delOne($index)\" lx-color=\"grey\" class=\"mt+++\">-</lx-button>\n                </div>\n            </div>\n        </div>\n    </form>\n</div>");
$templateCache.put("module_question/tpl/activity-list.html","<div class=\"panel m+\" ng-init=\"initList()\">\n    <div class=\"panel-header\">\n        <div class=\"panel-header-wrapper\">\n            <h2 class=\"panel-header-title\">调查活动管理</h2>\n        </div>\n    </div>\n    <div class=\"data-table-container\">\n        <header class=\"data-table-header\">\n            <div class=\"data-table-header__label\">\n                <span class=\"fs-title\"></span>\n            </div>\n            <div class=\"data-table-header__actions\">\n                <lx-button ng-click=\"add()\" lx-type=\"flat\"><i class=\"mdi mdi-plus\"></i>增加</lx-button>\n            </div>\n        </header>\n        <table class=\"data-table\">\n            <thead>\n            <tr>\n                <th>活动名称</th>\n                <th>创建日期</th>\n                <th>创建人</th>\n                <th>操作</th>\n            </tr>\n            </thead>\n            <tbody>\n            <tr ng-repeat=\"item in items\">\n                <td>{{item.actname}}</td>\n                <td>{{item.createdate|mysqlDatetime}}</td>\n                <td>{{item.createid}}</td>\n                <td>\n                    <a href=\"javascript:\" ng-click=\"getAcitvityScores(item)\">统计</a>\n                    <a href=\"javascript:\" ng-click=\"edit(item)\">编辑</a>\n                    <a href=\"javascript:\" ng-click=\"delete(item)\">删除</a>\n                </td>\n            </tr>\n            </tbody>\n        </table>\n        <div class=\"has-divider has-divider--dark\"></div>\n        <div class=\"toolbar\"  ng-if=\"false\">\n            <div class=\"toolbar__left mr++\">\n                <span ng-if=\"paginationInfo.totalItem==0\">\n                    无查询结果\n                </span>\n            </div>\n            <span class=\"toolbar__label fs-title\">\n\n            </span>\n            <div class=\"toolbar__right\"  ng-if=\"paginationInfo.totalItem>0\">\n                <div class=\"mr+++\">\n                    <span>\n                    总共{{paginationInfo.totalItem}}条&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 每页显示：{{paginationInfo.pageSize}}条\n                    </span>\n                </div>\n                <div >\n                    <uib-pagination boundary-links=\"true\" total-items=\"paginationInfo.totalItem\"\n                                    ng-model=\"paginationInfo.curPage\"\n                                    items-per-page=\"paginationInfo.pageSize\" ng-change=\"pageChanged()\"\n                                    previous-text=\"&lsaquo;\" next-text=\"&rsaquo;\" first-text=\"&laquo;\"\n                                    last-text=\"&raquo;\">\n                    </uib-pagination>\n                </div>\n            </div>\n        </div>\n    </div>\n</div>\n");
$templateCache.put("module_question/tpl/activity-score.html","<div class=\"panel m+\" ng-init=\"initList()\">\n    <div class=\"panel-header\">\n        <div class=\"panel-header-wrapper\">\n            <h2 class=\"panel-header-title\">{{scores.activity.actname}}</h2>\n        </div>\n    </div>\n    <div class=\"data-table-container\">\n        <header class=\"data-table-header\">\n            <div class=\"data-table-header__label\">\n                <span class=\"fs-title\"></span>\n            </div>\n            <div class=\"data-table-header__actions\">\n                <lx-button ng-click=\"back()\" lx-type=\"flat\"><i class=\"mdi mdi-keyboard-backspace\"></i>返回</lx-button>\n            </div>\n        </header>\n        <table class=\"data-table\">\n            <thead>\n            <tr>\n                <th>被调查部门</th>\n                <th>录入笔数</th>\n                <th>最高分</th>\n                <th>最低分</th>\n                <th>平均分</th>\n            </tr>\n            </thead>\n            <tbody>\n            <tr ng-repeat=\"item in scores.depts\">\n                <td><a href=\"javascript:\" ng-click=\"exportToExcel(item)\">{{item.deptname}}</a></td>\n                <td>{{item.score.cntanswer}}</td>\n                <td>{{item.score.maxscore}}</td>\n                <td>{{item.score.minscore}}</td>\n                <td>{{item.score.avgscore}}</td>\n            </tr>\n            </tbody>\n        </table>\n        <div class=\"has-divider has-divider--dark\"></div>\n        <div class=\"toolbar\">\n            <div class=\"toolbar__left mr++\">\n                <span ng-if=\"paginationInfo.totalItem==0\">\n                    无查询结果\n                </span>\n\n            </div>\n            <span class=\"toolbar__label fs-title\">\n\n            </span>\n            <div class=\"toolbar__right\"  ng-if=\"paginationInfo.totalItem>0\">\n                <div class=\"mr+++\">\n                    <span>\n                    总共{{paginationInfo.totalItem}}条&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 每页显示：{{paginationInfo.pageSize}}条\n                    </span>\n                </div>\n                <div >\n                    <uib-pagination boundary-links=\"true\" total-items=\"paginationInfo.totalItem\"\n                                    ng-model=\"paginationInfo.curPage\"\n                                    items-per-page=\"paginationInfo.pageSize\" ng-change=\"pageChanged()\"\n                                    previous-text=\"&lsaquo;\" next-text=\"&rsaquo;\" first-text=\"&laquo;\"\n                                    last-text=\"&raquo;\">\n                    </uib-pagination>\n                </div>\n            </div>\n        </div>\n    </div>\n</div>\n");
$templateCache.put("module_question/tpl/detp-list.html","<div class=\"panel m+\" ng-init=\"initList()\">\n    <div class=\"panel-header\">\n        <div class=\"panel-header-wrapper\">\n            <h2 class=\"panel-header-title\">部门管理</h2>\n        </div>\n    </div>\n    <div class=\"data-table-container\">\n        <header class=\"data-table-header\">\n            <div class=\"data-table-header__label\">\n                <span class=\"fs-title\"></span>\n            </div>\n            <div class=\"data-table-header__actions\">\n                <lx-button  ng-click=\"addDept()\"  lx-type=\"flat\"><i class=\"mdi mdi-plus\"></i>增加</lx-button>\n            </div>\n        </header>\n        <table class=\"data-table\">\n            <thead>\n            <tr>\n                <th>部门名称</th>\n                <th>编辑</th>\n            </tr>\n            </thead>\n            <tbody>\n            <tr ng-repeat=\"item in items\">\n                <td>{{item.deptname}}</td>\n                <td>\n                    <a href=\"javascript:\" ng-click=\"modifyDept(item)\">编辑</a>\n                    <a href=\"javascript:\" ng-click=\"deleteDept(item)\">删除</a>\n                </td>\n            </tr>\n            </tbody>\n        </table>\n        <div class=\"has-divider has-divider--dark\"></div>\n        <div class=\"toolbar\" ng-if=\"false\">\n            <div class=\"toolbar__left mr++\">\n                <span ng-if=\"paginationInfo.totalItem==0\">\n                    无查询结果\n                </span>\n            </div>\n            <span class=\"toolbar__label fs-title\">\n\n            </span>\n            <div class=\"toolbar__right\"  ng-if=\"paginationInfo.totalItem>0\">\n                <div class=\"mr+++\">\n                    <span>\n                    总共{{paginationInfo.totalItem}}条&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 每页显示：{{paginationInfo.pageSize}}条\n                    </span>\n                </div>\n                <div >\n                    <uib-pagination boundary-links=\"true\" total-items=\"paginationInfo.totalItem\"\n                                    ng-model=\"paginationInfo.curPage\"\n                                    items-per-page=\"paginationInfo.pageSize\" ng-change=\"pageChanged()\"\n                                    previous-text=\"&lsaquo;\" next-text=\"&rsaquo;\" first-text=\"&laquo;\"\n                                    last-text=\"&raquo;\">\n                    </uib-pagination>\n                </div>\n            </div>\n        </div>\n    </div>\n</div>\n");
$templateCache.put("module_question/tpl/question-enterdata.html","<div flex-container=\"row\">\n    <div flex-item=\"2\">\n\n    </div>\n    <div flex-item=\"8\">\n        <div class=\"panel\">\n            <div class=\"panel-header\">\n                <div class=\"panel-header-wrapper\">\n                    <h2 class=\"panel-header-title\">{{actdept.activity.actname}}</h2>\n                </div>\n            </div>\n\n            <form name=\"form\" class=\"p+++\">\n                <div flex-container=\"row\" flex-gutter=\"16\">\n                    <div flex-item=\"5\">\n                        <lx-text-field   lx-label=\"被评价部门\">\n                            <input type=\"text\" ng-model=\"actdept.dept.deptname\" >\n                        </lx-text-field>\n                    </div>\n                    <div flex-item=\"2\">\n\n                    </div>\n                    <div flex-item=\"5\">\n                        <lx-text-field   lx-label=\"填写时间\"  >\n                            <input type=\"text\" ng-model=\"sysDate\" >\n                        </lx-text-field>\n                    </div>\n                </div>\n                <div flex-container=\"column\" >\n                    <section flex-container=\"column\" ng-repeat=\"item in actdept.tpl\" class=\"mb+\" >\n                        <h4><b>{{item.showseq}}、{{item.content}}</b></h4>\n                        <div class=\"mt+\" ng-if=\"item.type==\'1\'\">\n                            <lx-radio-group>\n                                <lx-radio-button ng-model=\"item.result\" value=\"{{d.id}}\"  required ng-repeat=\"d in item.sels\" >\n                                    {{d.msg}}\n                                </lx-radio-button>\n                            </lx-radio-group>\n                        </div>\n                        <div class=\"mt+\" ng-if=\"item.type==\'2\'\">\n                            <lx-text-field>\n                                <input type=\"text\" ng-model=\"item.result\" required>\n                            </lx-text-field>\n                        </div>\n                        <div class=\"has-divider has-divider--dark\"></div>\n                    </section>\n                </div>\n                <div class=\"toolbar\">\n                    <div class=\"toolbar__left mr++\">\n                    </div>\n                    <span class=\"toolbar__label fs-title\"></span>\n                    <div class=\"toolbar__right\">\n                        <lx-button  lx-size=\"l\" lx-color=\"green\" class=\"mr+\" ng-disabled=\"form.$invalid\" ng-click=\"submit()\"><i class=\"mdi mdi-content-save\"></i>提交</lx-button>\n                        <lx-button   lx-size=\"l\" lx-color=\"grey\" ui-sref=\"access.signin\"><i class=\"mdi mdi-keyboard-backspace\"></i>返回</lx-button>\n                    </div>\n                </div>\n            </form>\n        </div>\n    </div>\n</div>\n");
$templateCache.put("module_question/tpl/question-index.html","<div ng-init=\"getActivitys()\">\r\n\r\n</div>");
$templateCache.put("module_question/tpl/question-selectactivity.html","<form name=\"form\">\n    <div class=\"modal-header\">\n        <h4 class=\"modal-title\"><i class=\"fa fa-exclamation-circle\"></i>请选择调查活动</h4>\n    </div>\n    <div class=\"modal-body\">\n        <lx-radio-group>\n            <lx-radio-button ng-model=\"vm.outdata.act\" ng-value=\"act\"  required ng-repeat=\"act in vm.indata\" >\n                {{act.actname}}\n            </lx-radio-button>\n        </lx-radio-group>\n    </div>\n    <div class=\"modal-footer\">\n        <lx-button  ng-click=\"ok()\" ng-disabled=\"form.$invalid\" lx-color=\"green\">确定</lx-button>\n        <lx-button  ng-click=\"cancel()\" lx-color=\"grey\">关闭</lx-button>\n    </div>\n</form>\n\n");
$templateCache.put("module_question/tpl/question-selectdept.html","<form name=\"form\">\n    <div class=\"modal-header\">\n        <h4 class=\"modal-title\"><i class=\"fa fa-exclamation-circle\"></i>选择调查部门</h4>\n    </div>\n    <div class=\"modal-body\">\n        <lx-radio-group>\n            <lx-radio-button ng-model=\"vm.outdata.dept\" ng-value=\"dept\"  required ng-repeat=\"dept in vm.indata\" >\n                {{dept.deptname}}\n            </lx-radio-button>\n        </lx-radio-group>\n    </div>\n    <div class=\"modal-footer\">\n        <lx-button  ng-click=\"ok()\" ng-disabled=\"form.$invalid\"  lx-color=\"green\">确定</lx-button>\n        <lx-button  ng-click=\"cancel()\" lx-color=\"grey\">关闭</lx-button>\n    </div>\n</form>\n\n");
$templateCache.put("module_question/tpl/template-add.html","<div class=\"panel m++\">\n    <div class=\"panel-header\">\n        <div class=\"panel-header-wrapper\">\n            <h2 class=\"panel-header-title\">增加模板</h2>\n        </div>\n    </div>\n    <div class=\"toolbar\">\n        <div class=\"toolbar__left mr++\">\n        </div>\n        <span class=\"toolbar__label fs-title\"></span>\n        <div class=\"toolbar__right\">\n            <lx-button   lx-type=\"flat\" lx-size=\"l\" lx-color=\"green\" ng-click=\"save()\"><i class=\"mdi mdi-content-save\"></i>保存</lx-button>\n            <lx-button   lx-type=\"flat\" lx-size=\"l\" lx-color=\"grey\" ng-click=\"back()\"><i class=\"mdi mdi-keyboard-backspace\"></i>返回</lx-button>\n        </div>\n    </div>\n    <div class=\"has-divider has-divider--dark\"></div>\n\n    <form name=\"template\" class=\"p+\">\n        <div flex-container=\"row\" flex-gutter=\"16\">\n            <div flex-item=\"8\">\n                <lx-text-field   lx-label=\"模板名称\"  lx-allow-clear=\"true\" lx-valid=\"template.tplname.$valid\" lx-error=\"template.tplname.$invalid\" >\n                    <input type=\"text\" name=\"tplname\"  ng-model=\"tpl.tplname\"  required>\n                </lx-text-field>\n            </div>\n        </div>\n        <div flex-container=\"column\" ng-repeat=\"dtl in tpl.tplDtls\">\n            <div flex-container=\"row\" flex-column=\"16\" flex-gutter=\"24\" >\n                <div flex-item=\"12\">\n                    <lx-text-field   lx-label=\"{{dtl.showseq}}、调查问题\"  lx-allow-clear=\"true\" lx-valid=\"template.content.$valid\" lx-error=\"template.content.$invalid\" >\n                        <input type=\"text\" name=\"content\"  ng-model=\"dtl.content\" required>\n                    </lx-text-field>\n                </div>\n                <div flex-item=\"2\">\n                    <lx-select\n                            name=\"type\"\n                            ng-model=\"dtl.type\"\n                            lx-choices=\"seltyps\"\n                            lx-allow-clear=\"true\"\n                            lx-label=\"问题类型\"\n                            lx-multiple=\"false\"\n                            lx-display-filter=\"true\"\n                            lx-error=\"template.type.$invalid\"\n                            lx-track-by=\"id\"\n                            required\n                            >\n                        <lx-select-selected required>\n                            {{ $selected.name }}\n                        </lx-select-selected>\n\n                        <lx-select-choices>\n                            {{ $choice.name }}\n                        </lx-select-choices>\n                    </lx-select>\n                </div>\n                <div flex-item=\"2\">\n                    <lx-button lx-type=\"fab\" lx-size=\"s\" ng-click=\"addOne($index)\" lx-color=\"grey\" class=\"mt+++\">+</lx-button>\n                    <lx-button lx-type=\"fab\" lx-size=\"s\" ng-click=\"delOne($index)\" lx-color=\"grey\" class=\"mt+++\">-</lx-button>\n                </div>\n            </div>\n            <div flex-container=\"row\" flex-column=\"16\" flex-gutter=\"24\" ng-if=\"dtl.type==\'1\'\">\n                <div flex-item=\"11\">\n                    <lx-select\n                            name=\"choice\"\n                            ng-model=\"dtl.val\"\n                            lx-choices=\"sels\"\n                            lx-allow-clear=\"true\"\n                            lx-label=\"选择问题\"\n                            lx-multiple=\"true\"\n                            lx-display-filter=\"true\"\n                            lx-error=\"template.choice.$invalid\"\n                            required\n                            >\n                        <lx-select-selected required>\n                            {{ $selected.id}} - {{ $selected.msg }}\n                        </lx-select-selected>\n\n                        <lx-select-choices>\n                            {{ $choice.id}} - {{ $choice.msg }}\n                        </lx-select-choices>\n                    </lx-select>\n                </div>\n            </div>\n        </div>\n    </form>\n</div>");
$templateCache.put("module_question/tpl/template-edit.html","<div class=\"panel m++\">\n    <div class=\"panel-header\">\n        <div class=\"panel-header-wrapper\">\n            <h2 class=\"panel-header-title\">编辑模板</h2>\n        </div>\n    </div>\n    <div class=\"toolbar\">\n        <div class=\"toolbar__left mr++\">\n        </div>\n        <span class=\"toolbar__label fs-title\"></span>\n        <div class=\"toolbar__right\">\n            <lx-button  lx-size=\"m\" lx-color=\"green\" ng-click=\"update()\" class=\"mr+\"><i class=\"mdi mdi-content-save\"></i>保存</lx-button>\n            <lx-button  lx-size=\"m\" lx-color=\"grey\" ng-click=\"back()\"><i class=\"mdi mdi-keyboard-backspace\"></i>返回</lx-button>\n        </div>\n    </div>\n    <div class=\"has-divider has-divider--dark\"></div>\n\n    <form name=\"template\" class=\"p+\">\n        <div flex-container=\"row\" flex-gutter=\"16\">\n            <div flex-item=\"8\">\n                <lx-text-field   lx-label=\"模板名称\"  lx-allow-clear=\"true\" lx-valid=\"template.tplname.$valid\" lx-error=\"template.tplname.$invalid\" >\n                    <input type=\"text\" name=\"tplname\"  ng-model=\"tpl.tplname\"  required>\n                </lx-text-field>\n            </div>\n        </div>\n        <div flex-container=\"column\" ng-repeat=\"dtl in tpl.dtls\">\n            <div flex-container=\"row\" flex-column=\"16\" flex-gutter=\"24\" >\n                <div flex-item=\"12\">\n                    <lx-text-field   lx-label=\"{{dtl.showseq}}、调查问题\"  lx-allow-clear=\"true\" lx-valid=\"template.content.$valid\" lx-error=\"template.content.$invalid\" >\n                        <input type=\"text\" name=\"content\"  ng-model=\"dtl.content\" required>\n                    </lx-text-field>\n                </div>\n                <div flex-item=\"2\">\n                    <lx-select\n                            name=\"type\"\n                            ng-model=\"dtl.type\"\n                            lx-choices=\"seltyps\"\n                            lx-allow-clear=\"true\"\n                            lx-label=\"问题类型\"\n                            lx-multiple=\"false\"\n                            lx-display-filter=\"true\"\n                            lx-error=\"template.type.$invalid\"\n                            lx-track-by=\"id\"\n                            required\n                            >\n                        <lx-select-selected required>\n                            {{ $selected.name }}\n                        </lx-select-selected>\n\n                        <lx-select-choices>\n                            {{ $choice.name }}\n                        </lx-select-choices>\n                    </lx-select>\n                </div>\n                <div flex-item=\"2\">\n                    <lx-button lx-type=\"fab\" lx-size=\"s\" ng-click=\"addModifyOne($index)\" lx-color=\"grey\" class=\"mt+++\">+</lx-button>\n                    <lx-button lx-type=\"fab\" lx-size=\"s\" ng-click=\"delModifyOne($index)\" lx-color=\"grey\" class=\"mt+++\">-</lx-button>\n                </div>\n            </div>\n            <div flex-container=\"row\" flex-column=\"16\" flex-gutter=\"24\"  ng-if=\"dtl.type==\'1\'\">\n                <div flex-item=\"11\">\n                    <lx-select\n                            name=\"choice\"\n                            ng-model=\"dtl.sels\"\n                            lx-choices=\"sels\"\n                            lx-allow-clear=\"true\"\n                            lx-label=\"选择问题\"\n                            lx-multiple=\"true\"\n                            lx-display-filter=\"true\"\n                            lx-error=\"template.choice.$invalid\"\n                            required\n                            >\n                        <lx-select-selected required>\n                            {{ $selected.id}} - {{ $selected.msg }}\n                        </lx-select-selected>\n\n                        <lx-select-choices>\n                            {{ $choice.id}} - {{ $choice.msg }}\n                        </lx-select-choices>\n                    </lx-select>\n                </div>\n            </div>\n        </div>\n    </form>\n</div>");
$templateCache.put("module_question/tpl/template-list.html","<div class=\"panel m+\" ng-init=\"initList()\">\n    <div class=\"panel-header\">\n        <div class=\"panel-header-wrapper\">\n            <h2 class=\"panel-header-title\">模板管理</h2>\n        </div>\n    </div>\n    <div class=\"data-table-container\">\n        <header class=\"data-table-header\">\n            <div class=\"data-table-header__label\">\n                <span class=\"fs-title\"></span>\n            </div>\n            <div class=\"data-table-header__actions\">\n                <lx-button  ng-click=\"add()\"  lx-type=\"flat\"><i class=\"mdi mdi-plus\"></i>增加</lx-button>\n            </div>\n        </header>\n        <table class=\"data-table\">\n            <thead>\n            <tr>\n                <th>模板名称</th>\n                <th>备注</th>\n                <th>创建日期</th>\n                <th>创建人</th>\n                <th>操作</th>\n            </tr>\n            </thead>\n            <tbody>\n            <tr ng-repeat=\"item in items\">\n                <td>{{item.tplname}}</td>\n                <td>{{item.comment}}</td>\n                <td>{{item.createdate|mysqlDatetime}}</td>\n                <td>{{item.createid}}</td>\n                <td>\n                    <a href=\"javascript:\" ng-click=\"edit(item)\">编辑</a>\n                    <a href=\"javascript:\" ng-click=\"delete(item)\">删除</a>\n                </td>\n            </tr>\n            </tbody>\n        </table>\n        <div class=\"has-divider has-divider--dark\"></div>\n        <div class=\"toolbar\" ng-if=\"false\">\n            <div class=\"toolbar__left mr++\">\n                <span ng-if=\"paginationInfo.totalItem==0\">\n                    无查询结果\n                </span>\n            </div>\n            <span class=\"toolbar__label fs-title\">\n\n            </span><div class=\"toolbar__right\"  ng-if=\"paginationInfo.totalItem>0\">\n            <div class=\"mr+++\">\n                    <span>\n                    总共{{paginationInfo.totalItem}}条&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 每页显示：{{paginationInfo.pageSize}}条\n                    </span>\n            </div>\n            <div >\n                <uib-pagination boundary-links=\"true\" total-items=\"paginationInfo.totalItem\"\n                                ng-model=\"paginationInfo.curPage\"\n                                items-per-page=\"paginationInfo.pageSize\" ng-change=\"pageChanged()\"\n                                previous-text=\"&lsaquo;\" next-text=\"&rsaquo;\" first-text=\"&laquo;\"\n                                last-text=\"&raquo;\">\n                </uib-pagination>\n            </div>\n        </div>\n        </div>\n    </div>\n</div>\n");
$templateCache.put("module_system/tpl/sysaccount-add.html","<div class=\"wrapper-md\" ng-init=\"item={}\">\r\n    <div class=\"panel panel-default\">\r\n        <div class=\"panel-heading\">\r\n            新增用户\r\n            <span class=\"pull-right\"><i class=\"glyphicon glyphicon-remove\" id=\"spin\" ng-click=\"back()\"></i></span>\r\n        </div>\r\n        <div class=\"panel-body\">\r\n            <form name=\"form\">\r\n                <div class=\"row\">\r\n                    <div class=\"col-sm-4\">\r\n                        <label>登陆ID:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.id\" required/>\r\n                    </div>\r\n                    <div class=\"col-sm-4\">\r\n                        <label>姓名:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.name\" required/>\r\n                    </div>\r\n                    <div class=\"col-sm-4\">\r\n                        <label>所属机构:</label>\r\n\r\n                        <select ng-init=\"getSysBranchList()\" class=\"form-control\" ng-model=\"item.branchid\" ng-options=\"o.id as o.branchname for o in branchs\" required>\r\n                            <option value=\"\">请选择机构</option>\r\n                        </select>\r\n                    </div>\r\n                </div>\r\n                <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n                <div class=\"row\">\r\n                    <div class=\"col-sm-4\">\r\n                        <label>地址:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.address\"/>\r\n                    </div>\r\n                    <div class=\"col-sm-4\">\r\n                        <label>联系电话:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.telno\"/>\r\n                    </div>\r\n                    <div class=\"col-sm-4\">\r\n                        <label>邮箱:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.mail\"/>\r\n                    </div>\r\n                </div>\r\n                <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n                <div class=\"row\">\r\n                    <div class=\"col-sm-4\">\r\n                        <label>可查看数据范围:</label>\r\n                        <select  class=\"form-control\" ng-model=\"item.property\" required>\r\n                            <option value=\"1\">全公司</option>\r\n                            <option value=\"2\">本部门</option>\r\n                            <option value=\"3\">个人</option>\r\n                        </select>\r\n                    </div>\r\n                    <div class=\"col-sm-4\">\r\n                        <label>状态:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.status\"/>\r\n                    </div>\r\n                </div>\r\n                <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n                <div class=\"row\">\r\n                    <div class=\"col-sm-6\">\r\n                        <label>可选角色:</label>\r\n                        <select ng-init=\"getAllSysRoles()\"  multiple class=\"form-control\" ng-model=\"sysRole\" ng-dblclick=\"selectSysRoles()\" ng-options=\"o.id as o.rolename for o in allSysRoles\">\r\n                        </select>\r\n                    </div>\r\n                    <div class=\"col-sm-6\">\r\n                        <label>已选角色:</label>\r\n                        <select ng-init=\"userRoles=[]\"  multiple class=\"form-control\" ng-model=\"userRole\" ng-dblclick=\"selectUserRoles()\" ng-options=\"o.id as o.rolename for o in userRoles\">\r\n                        </select>\r\n                    </div>\r\n                </div>\r\n                <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n                <div class=\"form-group\">\r\n                    <div class=\"pull-right\">\r\n                        <lx-button   lx-size=\"l\" lx-color=\"green\"  ng-disabled=\"form.$invalid\"  ng-click=\"save()\"><i class=\"mdi mdi-content-save\"></i>保存</lx-button>\r\n                        <lx-button   lx-size=\"l\" lx-color=\"grey\" ng-click=\"back()\"><i class=\"mdi mdi-keyboard-backspace\"></i>返回</lx-button>\r\n                    </div>\r\n                </div>\r\n            </form>\r\n        </div>\r\n    </div>\r\n\r\n</div>");
$templateCache.put("module_system/tpl/sysaccount-detail.html","<div class=\"wrapper-md\">\r\n    <div class=\"panel panel-default\">\r\n        <div class=\"panel-heading\">\r\n            修改用户\r\n            <span class=\"pull-right\"><i class=\"glyphicon glyphicon-remove\" id=\"spin\" ng-click=\"back()\"></i></span>\r\n        </div>\r\n        <div class=\"panel-body\">\r\n            <form name=\"form\">\r\n                <div class=\"row\">\r\n                    <div class=\"col-sm-4\">\r\n                        <label>登陆ID:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.id\" required disabled/>\r\n                    </div>\r\n                    <div class=\"col-sm-4\">\r\n                        <label>姓名:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.name\" required/>\r\n                    </div>\r\n                    <div class=\"col-sm-4\">\r\n                        <label>所属机构:</label>\r\n                        <select ng-init=\"getSysBranchList()\" class=\"form-control\" ng-model=\"item.branchid\" ng-options=\"o.id as o.branchname for o in branchs\" required>\r\n                            <option value=\"\">请选择机构</option>\r\n                        </select>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n                <div class=\"row\">\r\n                    <div class=\"col-sm-4\">\r\n                        <label>地址:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.address\"/>\r\n                    </div>\r\n                    <div class=\"col-sm-4\">\r\n                        <label>联系电话:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.telno\"/>\r\n                    </div>\r\n                    <div class=\"col-sm-4\">\r\n                        <label>邮箱:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.mail\"/>\r\n                    </div>\r\n                </div>\r\n                <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n                <div class=\"row\">\r\n                    <div class=\"col-sm-4\">\r\n                        <label>可查看数据范围:</label>\r\n                        <select  class=\"form-control\" ng-model=\"item.property\" required>\r\n                            <option value=\"1\">全公司</option>\r\n                            <option value=\"2\">本部门</option>\r\n                            <option value=\"3\">个人</option>\r\n                        </select>\r\n                    </div>\r\n                    <div class=\"col-sm-4\">\r\n                        <label>状态:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.status\"/>\r\n                    </div>\r\n                </div>\r\n                <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n                <div class=\"row\" ng-init=\"initUserRoles()()\" >\r\n                    <div class=\"col-sm-6\">\r\n                        <label>可选角色:</label>\r\n                        <select  multiple class=\"form-control\" ng-model=\"sysRole\" ng-dblclick=\"selectSysRoles()\" ng-options=\"o.id as o.rolename for o in allSysRoles\">\r\n                        </select>\r\n                    </div>\r\n                    <div class=\"col-sm-6\">\r\n                        <label>已选角色:</label>\r\n                        <select   multiple class=\"form-control\" ng-model=\"userRole\" ng-dblclick=\"selectUserRoles()\" ng-options=\"o.id as o.rolename for o in userRoles\">\r\n                        </select>\r\n                    </div>\r\n                </div>\r\n                <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n                <div class=\"form-group\">\r\n                    <div class=\"pull-right\">\r\n                        <button type=\"button\" class=\"btn btn-success\"  ng-disabled=\"form.$invalid\" ng-click=\"modify()\"><i class=\"fa fa-save\"></i>修改</button>\r\n                        <button type=\"button\" class=\"btn btn-danger\" ng-click=\"delete()\"><i class=\"glyphicon glyphicon-floppy-remove\"></i>删除</button>\r\n                        <button type=\"button\" class=\"btn btn-default\" ng-click=\"back()\"><i class=\"glyphicon glyphicon-remove\"></i>取消</button>\r\n                    </div>\r\n                </div>\r\n            </form>\r\n\r\n        </div>\r\n    </div>\r\n\r\n</div>");
$templateCache.put("module_system/tpl/sysaccount-list.html","<div class=\"panel m+\">\r\n    <div class=\"panel-header\">\r\n        <div class=\"panel-header-wrapper\">\r\n            <h2 class=\"panel-header-title\">用户管理</h2>\r\n        </div>\r\n    </div>\r\n    <div class=\"data-table-container\">\r\n        <header class=\"data-table-header\">\r\n            <div class=\"data-table-header__label\">\r\n                <span class=\"fs-title\"></span>\r\n            </div>\r\n            <div class=\"data-table-header__actions\">\r\n                <lx-button  ui-sref=\"app.sysaccounts.add\" lx-type=\"flat\"><i class=\"mdi mdi-plus\"></i>增加</lx-button>\r\n            </div>\r\n        </header>\r\n        <table class=\"data-table\">\r\n            <thead>\r\n            <tr>\r\n                <th>用户ID</th>\r\n                <th>姓名</th>\r\n                <th>所属机构</th>\r\n                <th>地址</th>\r\n                <th>联系电话</th>\r\n                <th>邮箱</th>\r\n                <th>操作</th>\r\n            </tr>\r\n            </thead>\r\n            <tbody>\r\n            <tr ng-repeat=\"item in items\">\r\n                <td>{{item.id}}</td>\r\n                <td><a href=\"javascript:\" ng-click=\"detail(item.id)\">{{item.name}}</a></td>\r\n                <td>{{item.sysBranch.branchname}}</td>\r\n                <td>{{item.address}}</td>\r\n                <td>{{item.mobile}}</td>\r\n                <td>{{item.email}}</td>\r\n                <td>\r\n                    <a href=\"javascript:\" ng-click=\"detail(item.id)\">编辑</a>\r\n                    <a href=\"javascript:\" ng-click=\"resetPasswd(item.id)\">重置密码</a>\r\n                </td>\r\n            </tr>\r\n            </tbody>\r\n        </table>\r\n        <div class=\"has-divider has-divider--dark\"></div>\r\n        <div class=\"toolbar\">\r\n            <div class=\"toolbar__left mr++\">\r\n                <span ng-if=\"paginationInfo.totalItem==0\">\r\n                    无查询结果\r\n                </span>\r\n            </div>\r\n            <span class=\"toolbar__label fs-title\">\r\n\r\n            </span>\r\n            <div class=\"toolbar__right\"  ng-if=\"paginationInfo.totalItem>0\">\r\n                <div class=\"mr+++\">\r\n                    <span>\r\n                    总共{{paginationInfo.totalItem}}条&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 每页显示：{{paginationInfo.pageSize}}条\r\n                    </span>\r\n                </div>\r\n                <div >\r\n                    <uib-pagination boundary-links=\"true\" total-items=\"paginationInfo.totalItem\"\r\n                                    ng-model=\"paginationInfo.curPage\"\r\n                                    items-per-page=\"paginationInfo.pageSize\" ng-change=\"pageChanged()\"\r\n                                    previous-text=\"&lsaquo;\" next-text=\"&rsaquo;\" first-text=\"&laquo;\"\r\n                                    last-text=\"&raquo;\">\r\n                    </uib-pagination>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>\r\n");
$templateCache.put("module_system/tpl/sysbranch-add.html","<form name=\"form\">\r\n    <div class=\"wrapper-md\" ng-init=\"item={}\">\r\n        <div class=\"panel panel-default\">\r\n            <div class=\"panel-heading\">\r\n                新增经销商\r\n                <span class=\"pull-right\"><i class=\"glyphicon glyphicon-remove\" id=\"spin\" ng-click=\"back()\"></i></span>\r\n            </div>\r\n            <div class=\"panel-body\">\r\n                <div class=\"row\">\r\n                    <div class=\"col-sm-3\">\r\n                        <label>经销商编号:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.id\" required/>\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>经销商名称:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.branchname\" required/>\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>所属区域:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.areano\" required/>\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>开户账号:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.openbankno\" required/>\r\n                    </div>\r\n                </div>\r\n                <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n                <div class=\"row\">\r\n                    <div class=\"col-sm-3\">\r\n                        <label>户名:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.acctname\" required />\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>开户行:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.openbankname\" required />\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>经销商电话:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.branchtel\" />\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>经销商地址:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.branchaddress\"/>\r\n                    </div>\r\n                </div>\r\n                <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n                <div class=\"row\">\r\n                    <div class=\"col-sm-3\">\r\n                        <label>经销商简称:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.branchalias\" />\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>收货联系人:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.linkmain\" />\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>收货联系电话:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.linktel\" />\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>邮编:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.zipcode\"/>\r\n                    </div>\r\n                </div>\r\n                <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n                <div class=\"row\">\r\n                    <div class=\"col-sm-3\">\r\n                        <label>所属客户经理:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.manager\"/>\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>客户经理电话:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.managertel\"/>\r\n                    </div>\r\n                </div>\r\n                <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n                <div class=\"form-group\">\r\n                    <div class=\"pull-right\">\r\n                        <lx-button   lx-size=\"l\" lx-color=\"green\"  ng-disabled=\"form.$invalid\"  ng-click=\"save()\"><i class=\"mdi mdi-content-save\"></i>保存</lx-button>\r\n                        <lx-button   lx-size=\"l\" lx-color=\"grey\" ng-click=\"back()\"><i class=\"mdi mdi-keyboard-backspace\"></i>返回</lx-button>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n        </div>\r\n\r\n    </div>\r\n</form>\r\n");
$templateCache.put("module_system/tpl/sysbranch-detail.html","<form name=\"form\">\r\n    <div class=\"wrapper-md\">\r\n        <div class=\"panel panel-default\">\r\n            <div class=\"panel-heading\">\r\n                修改经销商\r\n                <span class=\"pull-right\"><i class=\"glyphicon glyphicon-remove\" id=\"spin\" ng-click=\"back()\"></i></span>\r\n            </div>\r\n            <div class=\"panel-body\">\r\n                <div class=\"row\">\r\n                    <div class=\"col-sm-3\">\r\n                        <label>经销商编号:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.id\" required disabled/>\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>经销商名称:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.branchname\" required/>\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>所属区域:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.areano\" required/>\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>开户账号:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.openbankno\" required/>\r\n                    </div>\r\n                </div>\r\n                <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n                <div class=\"row\">\r\n                    <div class=\"col-sm-3\">\r\n                        <label>户名:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.acctname\" required />\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>开户行:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.openbankname\" required />\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>经销商电话:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.branchtel\" />\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>经销商地址:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.branchaddress\"/>\r\n                    </div>\r\n                </div>\r\n                <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n                <div class=\"row\">\r\n                    <div class=\"col-sm-3\">\r\n                        <label>经销商简称:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.branchalias\" />\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>收货联系人:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.linkmain\" />\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>收货联系电话:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.linktel\" />\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>邮编:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.zipcode\"/>\r\n                    </div>\r\n                </div>\r\n                <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n                <div class=\"row\">\r\n                    <div class=\"col-sm-3\">\r\n                        <label>邮编:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.zipcode\"/>\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>所属客户经理:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.manager\"/>\r\n                    </div>\r\n                    <div class=\"col-sm-3\">\r\n                        <label>客户经理电话:</label>\r\n                        <input type=\"text\" class=\"form-control\" ng-model=\"item.managertel\"/>\r\n                    </div>\r\n                </div>\r\n                <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n                <div class=\"form-group\">\r\n                    <div class=\"pull-right\">\r\n                        <button type=\"button\" class=\"btn btn-success m-r-sm\"  ng-disabled=\"form.$invalid\" ng-click=\"modify()\"><i class=\"fa fa-save\"></i>修改</button>\r\n                        <button type=\"button\" class=\"btn btn-danger m-r-sm\"  ng-click=\"delete()\"><i class=\"glyphicon glyphicon-floppy-remove\"></i>删除</button>\r\n                        <button type=\"button\" class=\"btn btn-default\" ng-click=\"back()\"><i class=\"glyphicon glyphicon-remove\"></i>取消</button>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</form>\r\n");
$templateCache.put("module_system/tpl/sysbranch-list.html","<div class=\"bg-light lter b-b wrapper-md\" ng-init=\"getBranchTree()\">\r\n    <div class=\"row\">\r\n        <div class=\"col-sm-4\">\r\n            <div><h1 class=\"m-n font-thin h4\">机构管理</h1></div>\r\n        </div>\r\n        <div class=\"col-sm-8 pull-right\">\r\n            <button type=\"submit\" class=\"btn btn-info pull-right m-r-sm\" ng-click=\"add()\">\r\n                <i class=\"fa  fa-save\"></i>增加机构\r\n            </button>\r\n            <button type=\"submit\" class=\"btn btn-info pull-right m-r-sm\" ng-click=\"delete()\">\r\n                <i class=\"fa  fa-save\"></i>删除机构\r\n            </button>\r\n        </div>\r\n    </div>\r\n</div>\r\n<div class=\"wrapper-md\" >\r\n    <form name=\"app\">\r\n        <tabset class=\"tab-container\" ng-init=\"steps={percent:20, step1:true, step2:false, step3:false}\">\r\n            <tab heading=\"机构树\" active=\"steps.step1\" select=\"steps.percent=30\">\r\n                <div class=\"row\">\r\n                    <div class=\"col-sm-6\">\r\n                        <tree tree-data=\"branchTree\" can-checked=\"false\" name-field=\"branchname\"></tree>\r\n                    </div>\r\n                    <div class=\"col-sm-6\">\r\n                        <div class=\"row\">\r\n                            <div class=\"col-sm-12\">\r\n                                <label>上级机构名称:</label>\r\n                                <input type=\"text\" class=\"form-control\"  ng-model=\"selBranch.branchname\" disabled/>\r\n                            </div>\r\n                            <div class=\"col-sm-12\">\r\n                                <label>机构名称:</label>\r\n                                <input type=\"text\" class=\"form-control\"  ng-model=\"newBranch.branchname\" />\r\n                            </div>\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n            </tab>\r\n        </tabset>\r\n    </form>\r\n\r\n</div>");
$templateCache.put("module_system/tpl/sysmenu-add.html","<div class=\"wrapper-md\" ng-init=\"item={}\">\r\n    <div class=\"panel panel-default\">\r\n        <div class=\"panel-heading\">\r\n            新增经销商\r\n            <span class=\"pull-right\"><i class=\"glyphicon glyphicon-remove\" id=\"spin\" ng-click=\"back()\"></i></span>\r\n        </div>\r\n        <div class=\"panel-body\">\r\n            <div class=\"row\">\r\n                <div class=\"col-sm-6\">\r\n                    <label>菜单名称:</label>\r\n                    <input type=\"text\" class=\"form-control\" ng-model=\"item.menuname\" required/>\r\n                </div>\r\n                <div class=\"col-sm-6\">\r\n                    <label>菜单图标:</label>\r\n                    <input type=\"text\" class=\"form-control\" ng-model=\"item.iconclass\"/>\r\n                </div>\r\n            </div>\r\n            <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n            <div class=\"row\">\r\n                <div class=\"col-sm-6\">\r\n                    <label>路由路径:</label>\r\n                    <input type=\"text\" class=\"form-control\" ng-model=\"item.routepath\" required/>\r\n                </div>\r\n                <div class=\"col-sm-6\">\r\n                    <label>上级菜单:</label>\r\n                    <select  class=\"form-control\"  ng-change=\"getList()\"   ng-model=\"item.parentid\" ng-options=\"o.id as o.menuname for o in items\" required>\r\n                        <option value=\"\">请选择产品类型</option>\r\n                    </select>\r\n                </div>\r\n\r\n            </div>\r\n            <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n            <div class=\"form-group\">\r\n                <div class=\"pull-right\">\r\n                    <lx-button   lx-size=\"l\" lx-color=\"green\"  ng-disabled=\"form.$invalid\"  ng-click=\"save()\"><i class=\"mdi mdi-content-save\"></i>保存</lx-button>\r\n                    <lx-button   lx-size=\"l\" lx-color=\"grey\" ng-click=\"back()\"><i class=\"mdi mdi-keyboard-backspace\"></i>返回</lx-button>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n\r\n</div>");
$templateCache.put("module_system/tpl/sysmenu-detail.html","<div class=\"wrapper-md\">\r\n    <div class=\"panel panel-default\">\r\n        <div class=\"panel-heading\">\r\n            修改菜单\r\n            <span class=\"pull-right\"><i class=\"glyphicon glyphicon-remove\" id=\"spin\" ng-click=\"back()\"></i></span>\r\n        </div>\r\n        <div class=\"panel-body\">\r\n            <div class=\"row\">\r\n                <div class=\"col-sm-6\">\r\n                    <label>菜单名称:</label>\r\n                    <input type=\"text\" class=\"form-control\" ng-model=\"item.menuname\"/>\r\n                </div>\r\n                <div class=\"col-sm-6\">\r\n                    <label>菜单图标:</label>\r\n                    <input type=\"text\" class=\"form-control\" ng-model=\"item.iconclass\"/>\r\n                </div>\r\n            </div>\r\n            <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n            <div class=\"row\">\r\n                <div class=\"col-sm-6\">\r\n                    <label>路由路径:</label>\r\n                    <input type=\"text\" class=\"form-control\" ng-model=\"item.routepath\"/>\r\n                </div>\r\n                <div class=\"col-sm-6\">\r\n                    <label>上级菜单:</label>\r\n                    <input type=\"text\" class=\"form-control\" ng-model=\"item.parentid\"/>\r\n                </div>\r\n\r\n            </div>\r\n            <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n            <div class=\"form-group\">\r\n                <div class=\"pull-right\">\r\n                    <button type=\"button\" class=\"btn btn-success\" ng-click=\"modify()\"><i class=\"fa fa-save\"></i>修改</button>\r\n                    <button type=\"button\" class=\"btn btn-danger\" ng-click=\"delete()\"><i class=\"glyphicon glyphicon-floppy-remove\"></i>删除</button>\r\n                    <button type=\"button\" class=\"btn btn-default\" ng-click=\"back()\"><i class=\"glyphicon glyphicon-remove\"></i>取消</button>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n\r\n</div>");
$templateCache.put("module_system/tpl/sysmenu-list.html","<div class=\"panel m+\">\r\n    <div class=\"panel-header\">\r\n        <div class=\"panel-header-wrapper\">\r\n            <h2 class=\"panel-header-title\">菜单管理</h2>\r\n        </div>\r\n    </div>\r\n    <div class=\"data-table-container\">\r\n        <header class=\"data-table-header\">\r\n            <div class=\"data-table-header__label\">\r\n                <span class=\"fs-title\"></span>\r\n            </div>\r\n            <div class=\"data-table-header__actions\">\r\n                <lx-button  ui-sref=\"app.sysmenu.add\" lx-type=\"flat\"><i class=\"mdi mdi-plus\"></i>增加</lx-button>\r\n            </div>\r\n        </header>\r\n        <table class=\"data-table\">\r\n            <thead>\r\n            <tr>\r\n                <th>菜单ID</th>\r\n                <th>菜单名称</th>\r\n                <th>菜单图标</th>\r\n                <th>路由路径</th>\r\n                <th>上级菜单</th>\r\n                <th>操作</th>\r\n            </tr>\r\n            </thead>\r\n            <tbody>\r\n            <tr ng-repeat=\"item in items\">\r\n                <td>{{item.id}}</td>\r\n                <td>{{item.menuname}}</td>\r\n                <td>{{item.iconclass}}</td>\r\n                <td>{{item.routepath}}</td>\r\n                <td>{{item.parentid}}</td>\r\n                <td>\r\n                    <a href=\"javascript:\" ng-click=\"detail(item.id)\">编辑</a>\r\n                </td>\r\n            </tr>\r\n            </tbody>\r\n        </table>\r\n        <div class=\"has-divider has-divider--dark\"></div>\r\n        <div class=\"toolbar\">\r\n            <div class=\"toolbar__left mr++\">\r\n                <span ng-if=\"paginationInfo.totalItem==0\">\r\n                    无查询结果\r\n                </span>\r\n            </div>\r\n            <span class=\"toolbar__label fs-title\">\r\n\r\n            </span>\r\n            <div class=\"toolbar__right\"  ng-if=\"paginationInfo.totalItem>0\">\r\n                <div class=\"mr+++\">\r\n                    <span>\r\n                    总共{{paginationInfo.totalItem}}条&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 每页显示：{{paginationInfo.pageSize}}条\r\n                    </span>\r\n                </div>\r\n                <div >\r\n                    <uib-pagination boundary-links=\"true\" total-items=\"paginationInfo.totalItem\"\r\n                                    ng-model=\"paginationInfo.curPage\"\r\n                                    items-per-page=\"paginationInfo.pageSize\" ng-change=\"pageChanged()\"\r\n                                    previous-text=\"&lsaquo;\" next-text=\"&rsaquo;\" first-text=\"&laquo;\"\r\n                                    last-text=\"&raquo;\">\r\n                    </uib-pagination>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>\r\n");
$templateCache.put("module_system/tpl/sysrole-add.html","<div class=\"wrapper-md\" ng-init=\"item={}\">\r\n    <div class=\"panel panel-default\">\r\n        <div class=\"panel-heading\">\r\n            增加角色\r\n            <span class=\"pull-right\"><i class=\"glyphicon glyphicon-remove\" id=\"spin\" ng-click=\"back()\"></i></span>\r\n        </div>\r\n        <div class=\"panel-body\">\r\n            <div class=\"row\">\r\n                <div class=\"col-sm-6\">\r\n                    <label>角色名称:</label>\r\n                    <input type=\"text\" class=\"form-control\" ng-model=\"item.rolename\"/>\r\n                </div>\r\n            </div>\r\n            <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n            <div class=\"form-group\">\r\n                <div class=\"pull-right\">\r\n                    <lx-button   lx-size=\"l\" lx-color=\"green\"  ng-disabled=\"form.$invalid\"  ng-click=\"save()\"><i class=\"mdi mdi-content-save\"></i>保存</lx-button>\r\n                    <lx-button   lx-size=\"l\" lx-color=\"grey\" ng-click=\"back()\"><i class=\"mdi mdi-keyboard-backspace\"></i>返回</lx-button>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n\r\n</div>");
$templateCache.put("module_system/tpl/sysrole-auth.html","<div class=\"wrapper-md\" ng-init=\"item={}\">\r\n    <div class=\"panel panel-default\">\r\n        <div class=\"panel-heading\">\r\n            设置角色权限\r\n            <span class=\"pull-right\"><i class=\"glyphicon glyphicon-remove\" id=\"spin\" ng-click=\"back()\"></i></span>\r\n        </div>\r\n        <div class=\"panel-body\">\r\n            <div class=\"row\">\r\n                <div class=\"col-sm-6\">\r\n                    <tree tree-data=\"treeData\" can-checked=\"true\" name-field=\"title\"></tree>\r\n                </div>\r\n            </div>\r\n            <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n            <div class=\"form-group\">\r\n                <div class=\"col-sm-3 col-sm-offset-9\">\r\n                    <button type=\"button\" class=\"btn btn-success\" ng-click=\"saverolemenu()\"><i class=\"fa fa-save\"></i>保存</button>\r\n                    <button type=\"button\" class=\"btn btn-default\" ng-click=\"back()\"><i class=\"glyphicon glyphicon-remove\"></i>取消</button>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n\r\n</div>");
$templateCache.put("module_system/tpl/sysrole-detail.html","<div class=\"wrapper-md\">\r\n    <div class=\"panel panel-default\">\r\n        <div class=\"panel-heading\">\r\n            修改角色\r\n            <span class=\"pull-right\"><i class=\"glyphicon glyphicon-remove\" id=\"spin\" ng-click=\"back()\"></i></span>\r\n        </div>\r\n        <div class=\"panel-body\">\r\n            <div class=\"row\">\r\n                <div class=\"col-sm-6\">\r\n                    <label>角色名称:</label>\r\n                    <input type=\"text\" class=\"form-control\" ng-model=\"item.rolename\"/>\r\n                </div>\r\n            </div>\r\n            <div class=\"line line-dashed b-b line-sm pull-in\"></div>\r\n            <div class=\"form-group\">\r\n                <div class=\"pull-right\">\r\n                    <button type=\"button\" class=\"btn btn-success\" ng-click=\"modify()\"><i class=\"fa fa-save\"></i>修改</button>\r\n                    <button type=\"button\" class=\"btn btn-danger\" ng-click=\"delete()\"><i class=\"glyphicon glyphicon-floppy-remove\"></i>删除</button>\r\n                    <button type=\"button\" class=\"btn btn-default\" ng-click=\"back()\"><i class=\"glyphicon glyphicon-remove\"></i>取消</button>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n\r\n</div>");
$templateCache.put("module_system/tpl/sysrole-list.html","<div class=\"panel m+\">\r\n    <div class=\"panel-header\">\r\n        <div class=\"panel-header-wrapper\">\r\n            <h2 class=\"panel-header-title\">角色管理</h2>\r\n        </div>\r\n    </div>\r\n    <div class=\"data-table-container\">\r\n        <header class=\"data-table-header\">\r\n            <div class=\"data-table-header__label\">\r\n                <span class=\"fs-title\"></span>\r\n            </div>\r\n            <div class=\"data-table-header__actions\">\r\n                <lx-button  ui-sref=\"app.sysrole.add\" lx-type=\"flat\"><i class=\"mdi mdi-plus\"></i>增加</lx-button>\r\n            </div>\r\n        </header>\r\n        <table class=\"data-table\">\r\n            <thead>\r\n            <tr>\r\n                <th>角色ID</th>\r\n                <th>角色名称</th>\r\n                <th>操作</th>\r\n            </tr>\r\n            </thead>\r\n            <tbody>\r\n            <tr ng-repeat=\"item in items\">\r\n                <td>{{item.id}}</td>\r\n                <td>{{item.rolename}}</td>\r\n                <td>\r\n                    <a href=\"javascript:\" ng-click=\"detail(item.id)\">编辑</a>\r\n                    <a href=\"javascript:\" ng-click=\"setauth(item.id)\">设置权限</a>\r\n                </td>\r\n            </tr>\r\n            </tbody>\r\n        </table>\r\n        <div class=\"has-divider has-divider--dark\"></div>\r\n        <div class=\"toolbar\">\r\n            <div class=\"toolbar__left mr++\">\r\n                <span ng-if=\"paginationInfo.totalItem==0\">\r\n                    无查询结果\r\n                </span>\r\n            </div>\r\n            <span class=\"toolbar__label fs-title\">\r\n\r\n            </span>\r\n            <div class=\"toolbar__right\"  ng-if=\"paginationInfo.totalItem>0\">\r\n                <div class=\"mr+++\">\r\n                    <span>\r\n                    总共{{paginationInfo.totalItem}}条&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 每页显示：{{paginationInfo.pageSize}}条\r\n                    </span>\r\n                </div>\r\n                <div >\r\n                    <uib-pagination boundary-links=\"true\" total-items=\"paginationInfo.totalItem\"\r\n                                    ng-model=\"paginationInfo.curPage\"\r\n                                    items-per-page=\"paginationInfo.pageSize\" ng-change=\"pageChanged()\"\r\n                                    previous-text=\"&lsaquo;\" next-text=\"&rsaquo;\" first-text=\"&laquo;\"\r\n                                    last-text=\"&raquo;\">\r\n                    </uib-pagination>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>\r\n");
$templateCache.put("module_utils/tpl/dialog-confirm.html","<form name=\"form\">\r\n    <div class=\"modal-header\">\r\n        <h4 class=\"modal-title\"><i class=\"fa fa-exclamation-circle\"></i>{{title}}</h4>\r\n    </div>\r\n    <div class=\"modal-body\">\r\n        <div>\r\n            {{tips}}\r\n        </div>\r\n    </div>\r\n    <div class=\"modal-footer\">\r\n        <lx-button  ng-click=\"ok()\" lx-color=\"green\">确定</lx-button>\r\n        <lx-button  ng-click=\"cancel()\" lx-color=\"grey\">关闭</lx-button>\r\n    </div>\r\n</form>\r\n\r\n");
$templateCache.put("module_utils/tpl/dialog-error.html","<form name=\"form\">\r\n    <div class=\"modal-header\">\r\n        <h4 class=\"modal-title\"><i class=\"fa fa-warning\"></i>系统故障</h4>\r\n    </div>\r\n    <div class=\"modal-body\">\r\n        <div>\r\n            {{errmsg}}\r\n        </div>\r\n    </div>\r\n    <div class=\"modal-footer\">\r\n        <lx-button  ng-click=\"cancel()\" lx-color=\"grey\">关闭</lx-button>\r\n    </div>\r\n</form>\r\n\r\n");
$templateCache.put("module_utils/tpl/dialog-info.html","<form name=\"form\">\r\n    <div class=\"modal-header\">\r\n        <h4 class=\"modal-title\"><i class=\"fa fa-exclamation-circle\"></i>{{title}}</h4>\r\n    </div>\r\n    <div class=\"modal-body\">\r\n        <div>\r\n            {{tips}}\r\n        </div>\r\n    </div>\r\n    <div class=\"modal-footer\">\r\n        <lx-button  ng-click=\"cancel()\" lx-color=\"grey\">关闭</lx-button>\r\n    </div>\r\n</form>\r\n\r\n");
$templateCache.put("module_utils/tpl/dialog-print.html","<form name=\"form\">\r\n    <div class=\"modal-body\">\r\n        <div  ng-include=\"templateUrl\"></div>\r\n    </div>\r\n    <div class=\"modal-footer\">\r\n        <lx-button  ng-click=\"print()\" lx-color=\"green\">确定</lx-button>\r\n        <lx-button  ng-click=\"cancel()\" lx-color=\"grey\">关闭</lx-button>\r\n    </div>\r\n\r\n</form>\r\n\r\n");
$templateCache.put("module_utils/tpl/dialog-prompt.html","<form name=\"form\">\n    <div class=\"modal-header\">\n        <h4 class=\"modal-title\"><i class=\"fa fa-exclamation-circle\"></i>{{title}}</h4>\n    </div>\n    <div class=\"modal-body\">\n        <form name=\"test\">\n            <div flex-container=\"row\">\n                <div flex-item=\"2\">\n\n                </div>\n                <div flex-item=\"8\">\n                    <lx-text-field   lx-label=\"{{placeholder}}\"  lx-allow-clear=\"true\" lx-valid=\"test.val.$valid\" lx-error=\"test.val.$invalid\" >\n                        <input type=\"text\" name=\"val\"  ng-model=\"vm.result\"  required>\n                    </lx-text-field>\n                </div>\n            </div>\n        </form>\n    </div>\n    <div class=\"modal-footer\">\n        <lx-button  ng-click=\"ok()\" lx-color=\"green\">确定</lx-button>\n        <lx-button  ng-click=\"cancel()\" lx-color=\"grey\">关闭</lx-button>\n    </div>\n</form>\n\n");}]);