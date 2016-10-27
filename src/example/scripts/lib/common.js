/**
 * Created by cup on 8/26/16.
 */

/**
 * Created by cup on 15/12/17.
 */

define(function ($) {
    'use strict';

    var YZ = window.YZ || {};

    YZ.Const = YZ.Const || {};

    YZ.Const.AppName = {
        // projName => real gong zhong hao
        DuoShouQian: 'weui',
        TuJiaYanMei: 'tujiayanmei',
        Scan2FetchCoupon: 'testaccount',
        TestEnv: 'testaccount'
    };
    YZ.Const.RespCode = {
        // projName => real gong zhong hao
        Success: '00',
        MustLogin: '999',
        Dangerous: '+9x9+'
    };
    YZ.Const.isProdMode = (window.location.pathname.indexOf('/prod/') > 0);

    YZ.Common = YZ.Common || {};

    YZ.Common.UI = YZ.Common.UI || {};

    var _UPParams = {}, commonUI = YZ.Common.UI;

    // public methods as below:

    $.extend(YZ.Common, {
        /**
         * Variables
         */
        isWX: (navigator.userAgent.toLowerCase().indexOf('micromessenger') >= 0),
        envPrefix: (YZ.Const.isProdMode ? '/weui/prod' : '/weui'),

        urlParams: (function urlQuery2Obj(str) {
            if (!str) {
                str = location.search;
            }

            if (str[0] === '?' || str[0] === '#') {
                str = str.substring(1);
            }
            var query = {};

            str.replace(/\b([^&=]*)=([^&=]*)/g, function (m, a, d) {
                if (typeof query[a] != 'undefined') {
                    query[a] += ',' + decodeURIComponent(d);
                } else {
                    query[a] = decodeURIComponent(d);
                }
            });

            return query;
        })(),

        isWxRedirectPage: function () {
            var queries = this.urlParams;
            return (queries && queries.code && queries.state);
        },

        /**
         * *******************************************
         * Methods
         */

        /************** 初始化， 配置类相关  ****************/

        config: function (appName) {
            _UPParams.appName = appName;

            _UPParams.weChatUrl = ('//www.wygreen.cn' + (YZ.Const.isProdMode ?
                '/weui/prod/server/wechat.php' : '/weui/server/wechat.php'));
        },

        /******************  与后台网络接口相关  *****************/

        storageNameForOpenId: function (indicator) {
            if (!indicator || indicator.length === 0) {
                // no tel.
                console.error('>>> storageNameForOpenId, indicator is expected!!!');
            }
            return (window.location.hostname + '_' + 'openId_' + indicator);
        },

        weChatUrl: function (action) {
            if (YZ.Common.String.hasSurfix(action, '.php')) {
                /*
                 访问的后台单独的php.
                 */
                /*
                 core 外面单独的PHP会来处理。
                 */

                return  (YZ.Common.envPrefix + '/server/'
                + action + '?appName=' + _UPParams.appName);
            }
            else {
                return (_UPParams.weChatUrl + '?appName=' + _UPParams.appName + '&requestAction=' + action);
            }
        },

        /**
         *
         * @param action
         * @param data
         * @param success
         *
         *  code: 00, 01, ...
         *  msg: mainly for error.
         *  params: for success data.
         *
         * @param fail
         *
         */
        ajax2Php: function (params) {
            if(!params) {
                return;
            }

            console.log('ajax2Php for action ' + params.action);
//debugger
            // true ||
            if(true ||YZ.Const.isProdMode) {
                params.params && (delete params.params.mockServer);
            }

            var url = '';
            //if(params.params && params.mockServer === '1') {
            //    //url = '//www.wygreen.cn/weui/mockServer/' + data.id;
            //    url = window.location.origin + '/weui/mockServer/' + params.params.id;
            //}
            //else
            {
                url = YZ.Common.weChatUrl(params.action);
            }

            /*
             For post request, the default is form type, ok for our php server.
             https://imququ.com/post/four-ways-to-post-data-in-http.html
             */
            $.ajax({
                type: (params.type || 'POST'),
                url: url,
                data: params.params,
                //contentType: 'application/json',
                //dataType: "json",
                success: function (resp) {
                    // success
                    //debugger
                    if (!$.isPlainObject(resp)) {
                        resp = JSON.parse(resp);
                    }

                    if (resp.code === YZ.Const.RespCode.Success) {
                        $.isFunction(params.success) && params.success(resp);
                    }
                    else if(resp.code === YZ.Const.RespCode.MustLogin) {
                        commonUI.dismiss();
                        YZ.Pay.login();
                    }
                    else if(resp.code === YZ.Const.RespCode.Dangerous) {
                        commonUI.dismiss();
                        YZ.Pay.checkAccount(resp);
                    }
                    else {
                        if ($.isFunction(params.fail)) {
                            params.fail(resp);
                        }
                        else {
                            var msg = resp && resp.msg ? resp.msg : '服务器繁忙，请稍后再试！';
                            commonUI.dismiss();
                            commonUI.showPopup(msg);
                        }
                    }
                },
                error: function (err) {
                    // fail
                    if (params.fail) {
                        params.fail(err);
                    }
                    else {
                        commonUI.dismiss();
                        commonUI.showPopup('网络不给力哟');
                    }
                }
            });
        },

        /*
         to private later.
         */
        fetchJSSignature: function (wx, success, fail, params) {
            /**
             * got js-sdk signature
             *
             */
            YZ.Common.ajax2Php({
                action: 'wxJsSignature',
                success: function (data) {
                    // success
                    data = data.params;

                    var msg = 'data = ' + JSON.stringify(data);
                    console.log(msg);
                    //alert(msg);
                    //process(data);

                    var configParams = data;
                    $.extend(configParams, params);

                    wx.config(configParams);

                    // wx is ready.
                    wx.ready(success);

                    wx.error(fail);

                    if(YZ.Const.mockable) {
                        success && success();
                    }
                }
            });
        },

        fetchJSSignatureNew: function (success, fail, methods) {

            if (!$.isArray(methods)) {
                alert('methods 参数必须是数组');
                return;
            }

            requirejs(['//res.wx.qq.com/open/js/jweixin-1.0.0.js'], function (wx) {

                YZ.Common.fetchJSSignature(wx, function () {
                    success && success(wx);

                }, fail, {
                    jsApiList: methods
                });
            });
        },




        /**
         * This API is obsoleted...
         *
         *  --> 开发阶段所有请求通过自己的php后台来完成。
         * @param data
         * {
                type: 'POST', // 默认是GET
                action:'userLogin',
                params:key_value pair,
                success: successCB,
                fail: failCB,
                disableLoading: 不显示loading框，// 默认显示loading框， 转圈但不会把整个页面给block住。
                showWaiting: 转圈页面会把整个页面给block住，适用于表单提交等逻辑，请求执行过程是原子操作。
             *
             */
        ajax2BackendByPhp: function (data) {
            "use strict";
//debugger
            if (!data || (typeof data !== "object")) {
                console.error('Method ajax2BackendByPhp must have parameter data');
                return;
            }

            // 默认的action就是'zero2Scan'
            data.action = data.action || 'zero2Scan';

            this.ajax2Php(data);
        },

        /******************  工具方法集合  *****************/

        urlAppendParams: function (href, params) {
            if (typeof href === 'undefined' || href.length === 0) {
                href = window.location.href;
            }

            if (params) {
                var queries = '';
                $.each(params, function (key, value) {
                    if (key && value) {
                        queries += (key + '=' + encodeURIComponent(value) + '&');
                    }
                });

                if (queries.length) {
                    // remove the last &
                    queries = queries.substr(0, queries.length - 1);

                    if (href.indexOf('?') > 0) {
                        href += '&' + queries;
                    }
                    else {
                        href += '?' + queries;
                    }
                }
            }

            // has suffix
            //if(href && href.char)

            return href;
        },

        // 创建{{}}占位的模板
        createTpl: function (t) {
            return function (m) {
                return t.replace(/\\?\{{([^{}]+)}}/gm, function (t, e) {
                    return m && m[e] || "";
                });
            };
        },

        //验证手机号的输入是否正确
        checkTel: function (tel) {
            // 合法的手机号码以1开头的10位数字。
            var reg = /^1\d{10}$/;
            return reg.test(tel);
        },


        loadjscssfile: function (filename, filetype) {
            var fileref;
            if (filetype === "js") { //if filename is a external JavaScript file
                fileref = document.createElement('script');
                fileref.setAttribute("type", "text/javascript");
                fileref.setAttribute("src", filename);
            }
            else if (filetype === "css") { //if filename is an external CSS file
                fileref = document.createElement("link");
                fileref.setAttribute("rel", "stylesheet");
                fileref.setAttribute("type", "text/css");
                fileref.setAttribute("href", filename);
            }

            if (typeof fileref !== "undefined") {
                document.getElementsByTagName("head")[0].appendChild(fileref);
            }
        },

        isHidden: function($dom) {
            var style = $dom && $dom.attr('style');
            //var style = window.getComputedStyle(el);
            return (style === "display: none;" || style === "display:none;");
        },

        icon2DataUrl: function(url, callback, outputFormat) {
            var img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = function(){
                var canvas = document.createElement('CANVAS');
                var ctx = canvas.getContext('2d');
                var dataURL;
                canvas.height = this.height;
                canvas.width = this.width;
                ctx.drawImage(this, 0, 0);
                dataURL = canvas.toDataURL(outputFormat);
                callback(dataURL);
                canvas = null;
                //img = null; // need it? when to destory it automatically?
            };
            img.src = url;
        },

        isValidMoney: function (amount) {
            /*
             http://stackoverflow.com/questions/2227370/currency-validation
             1. 所有整数（正负均可）。 2. 或者小数，小数点后面最多两位。
             */
            return amount && amount.length > 0 &&
                (/^-?[1-9]\d*$/.test(amount) || /^\d+(?:\.\d{0,2})$/.test(amount)) &&
                parseFloat(amount) > 0;
        },

        isValidPhone: function (phone) {
            // 合法的手机号码以1开头的10位数字。
            var reg = /^1\d{10}$/;
            return reg.test(phone);
        }

    });

    /*
     *  UI related.
     */
    $.extend(YZ.Common.UI, {

        showAlert: function (params, autoFadeOut) {
            //!title && (title = '<strong>提示：</strong>');
            //content = title + content;

            this.dismiss();

            var dom;

            params.title = params.title || '提示';
            params.midBtn = params.midBtn || '我知道了';
            params.message = params.message || params.msg;

            if(params.leftBtn && params.rightBtn) {
                /*
                 两个按钮的。
                 */
                dom = '<div class="weui_dialog_alert" id="alertDialog" style="display: block;">' +
                    '<div class="weui_mask"></div>' +
                    '<div class="weui_dialog">' +
                    '<div class="weui_dialog_hd"><strong class="weui_dialog_title">{{title}}</strong></div>' +
                    '<div class="weui_dialog_bd">{{message}}</div>' +
                    '<div class="weui_dialog_ft">' +
                    '<a href="javascript:;" class="weui_btn_dialog default">{{leftBtn}}</a>' +
                    '<a href="javascript:;" class="weui_btn_dialog primary">{{rightBtn}}</a>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            }
            else if(params.midBtn) {
                /*
                 一个按钮的。
                 */
                dom = '<div class="weui_dialog_alert" id="alertDialog" style="display: block;">' +
                    '<div class="weui_mask"></div>' +
                    '<div class="weui_dialog">' +
                    '<div class="weui_dialog_hd"><strong class="weui_dialog_title">{{title}}</strong></div>' +
                    '<div class="weui_dialog_bd">{{message}}</div>' +
                    '<div class="weui_dialog_ft">' +
                    '<a href="javascript:;" class="weui_btn_dialog primary">{{midBtn}}</a>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            }

            var t = YZ.Common.createTpl(dom);
            var tt = t(params);

            $('body').append(tt);

            $('#alertDialog').find('.weui_btn_dialog').one('click', function (e) {
                commonUI.dismiss();
                /*
                 需要特殊处理的。
                 */
                if($(e.target).hasClass('primary') && params.action) {
                    params.action();
                }
            });
        },

        /*
         主要用于失败类提示，文字内容会多一些，3秒后自动消失;
         */
        showPopup: function (msg, cb) {

            if(!msg || msg === '') {
                return;
            }

            this.dismiss();

            var dom =
                '<div class="weui_dialog_confirm" id="alertDialog" style="display: block;">' +
                '<div class="weui_mask"></div>' +
                '<div class="weui_dialog">' +
                '<br>' +
                '<div class="weui_dialog_bd" style="text-align: center">' + msg + '</div>' +
                '<br>' +
                '</div>' +
                '</div>';

            $('body').append($(dom));

            // 自动弹框消失类型。
            setTimeout(function(){
                commonUI.dismiss(cb);
            }, 3000);

            $('#alertDialog .weui_mask').on('click', function(){
                commonUI.dismiss(cb);
            });
        },

        /**
         * 主要用于成功提示。 2秒以后自动消失。
         */
        showToast: function(msg, cb) {
            var message = msg || '已完成',
                dom =
                    '<div id="toast" style="display: block;">' +
                    '<div class="weui_mask_transparent"></div>' +
                    '<div class="weui_toast">' +
                    '<i class="weui_icon_toast"></i>' +
                    '<p class="weui_toast_content">' + message + '</p>' +
                    '</div>' +
                    '</div>';

            $('body').append(dom);

            setTimeout(function() {
                commonUI.dismiss(cb);
            }, 2000);

            $('#toast').on('click', function(){
                commonUI.dismiss(cb);
            });
        },

        showLoading: function (msg) {
            var $loading = $('#loadingToast');

            if (!$loading || $loading.length === 0) {
                var dom = '<div id="loadingToast" class="weui_loading_toast" style="display:block;">' +
                    '<div class="weui_mask_transparent"></div>' +
                    '<div class="weui_toast">' +
                    '<div class="weui_loading">' +
                    '<div class="weui_loading_leaf weui_loading_leaf_0"></div>' +
                    '<div class="weui_loading_leaf weui_loading_leaf_0"></div>' +
                    '<div class="weui_loading_leaf weui_loading_leaf_1"></div>' +
                    '<div class="weui_loading_leaf weui_loading_leaf_2"></div>' +
                    '<div class="weui_loading_leaf weui_loading_leaf_3"></div>' +
                    '<div class="weui_loading_leaf weui_loading_leaf_4"></div>' +
                    '<div class="weui_loading_leaf weui_loading_leaf_5"></div>' +
                    '<div class="weui_loading_leaf weui_loading_leaf_6"></div>' +
                    '<div class="weui_loading_leaf weui_loading_leaf_7"></div>' +
                    '<div class="weui_loading_leaf weui_loading_leaf_8"></div>' +
                    '<div class="weui_loading_leaf weui_loading_leaf_9"></div>' +
                    '<div class="weui_loading_leaf weui_loading_leaf_10"></div>' +
                    '<div class="weui_loading_leaf weui_loading_leaf_11"></div>' +
                    '</div>' +
                    '<p class="weui_toast_content">' + (msg ? msg : '努力加载中') + '</p>' +
                    '</div>' +
                    '</div>';

                $('body').append(dom);
            }
        },

        dismiss: function (cb) {
            $('#loadingToast').remove();
            $('#alertDialog').remove();
            $('#toast').remove();

            //console.log('...dismiss');

            $.isFunction(cb) && cb();
        },

        isLoadingInProgress: function () {
            return ($('#loadingToast').length > 0);
        },

        showActionSheet: function (options) {

            if(!options || !options.cells) {
                alert('showActionSheet options must contain cells!!');
                return;
            }

            options.cancel = options.cancel || '取消';

            /*
             construct dom.
             */
            if($('#actionSheet_wrap') && $('#actionSheet_wrap').length) {
                // available, no need to setup it again.
                $('#actionSheet_wrap .weui_actionsheet_menu').empty();
                $('#actionSheet_wrap .weui_actionsheet_action').empty();
            }
            else {
                /*
                 先 display: none  后show 为了做sheet从下往上的动画。
                 */
                var dom = '<div id="actionSheet_wrap style="display: none"">' +
                    '<div class="weui_mask_transition" id="mask"></div>' +
                    '<div class="weui_actionsheet" id="weui_actionsheet"' +
                    '<div class="weui_actionsheet_menu">' +
                    '</div>' +
                    '<div class="weui_actionsheet_action">' +
                    '</div>' +
                    '</div>' +
                    '</div>';

                dom = '<div id="actionSheet_wrap" style="display: none">' +
                    '<div class="weui_mask_transition" id="mask"></div>' +
                    '<div class="weui_actionsheet" id="weui_actionsheet">' +
                    '<div class="weui_actionsheet_menu">' +
                    '</div>' +
                    '<div class="weui_actionsheet_action">' +
                    '</div>' +
                    '</div>' +
                    '</div>';

                //$('#shoudanPage').append(dom);
                $('body').append(dom);
                //$('#actionSheet_wrap').hide();
            }

            var cellT = YZ.Common.createTpl('<div class="weui_actionsheet_cell" value="{{value}}">{{name}}</div>'),
                cancelT = YZ.Common.createTpl('<div class="weui_actionsheet_cell" id="actionsheet_cancel">{{cancel}}</div>');

            $('#actionSheet_wrap .weui_actionsheet_action').append(cancelT(options));

            var $divMenu = $('#actionSheet_wrap .weui_actionsheet_menu');

            $.each(options.cells, function(index, item){
                $divMenu.append(cellT(item));
            });

            $('#actionSheet_wrap').show();

            /*
             show dom.
             */
            var mask = $('#mask');
            var weuiActionsheet = $('#weui_actionsheet');
            weuiActionsheet.addClass('weui_actionsheet_toggle');
            mask.show().addClass('weui_fade_toggle').one('click', function () {
                hideActionSheet(weuiActionsheet, mask);
            });

            $('#actionsheet_cancel').one('click', function () {
                hideActionSheet(weuiActionsheet, mask);
            });

            // cell click event
            $('.weui_actionsheet_menu .weui_actionsheet_cell').one('click', function (e) {
                hideActionSheet(weuiActionsheet, mask);
                options.cellHandler && options.cellHandler(e);
            });

            weuiActionsheet.unbind('transitionend').unbind('webkitTransitionEnd');

            function hideActionSheet(weuiActionsheet, mask) {
                weuiActionsheet.removeClass('weui_actionsheet_toggle');
                mask.removeClass('weui_fade_toggle');
                weuiActionsheet.on('transitionend', function () {
                    mask.hide();
                }).on('webkitTransitionEnd', function () {
                    mask.hide();
                })
            }
        },

        closeWebWindow: function(){
            // close page.
            YZ.Common.fetchJSSignatureNew(function(wx){
                wx.closeWindow();
            }, null, [
                'closeWindow'
            ]);
        },

        registerAdjustFontHandler: function(){

            // TODO
            return;

            /*
             1. 微信iOS多设备多字体适配方案总结
             https://mp.weixin.qq.com/s?__biz=MzAwNDY1ODY2OQ==&mid=207113485&idx=1&sn=c49615df4092cfc45a849d2e791fe5d8&scene=1&srcid=05042VAYQkR4KYdlTqltSmYh&pass_ticket=SCmaTqaAWpOx8%2Flb04ID22I49voiHBn1E%2B5oh7jKkD8%3D#rd

             2. https://isux.tencent.com/web-app-rem.html
             */

            //-webkit-text-size-adjust:none;  menuItem:setFont  全局设置，一处设置，多处Menu菜单有效
            document.getElementsByTagName("body")[0].style.webkitTextSizeAdjust = "100%";

            //YZ.Common.fetchJSSignatureNew(function(wx){
            //    wx.hideOptionMenu();
            //}, null, [
            //    'hideOptionMenu'
            //])
        }
    });

    /*
     string class extend.
     */
    YZ.Common.String = YZ.Common.String || {};
    $.extend(YZ.Common.String, {
        hasPrefix: function(str, prefix) {
            if (str && prefix && str.indexOf(prefix) === 0) {
                return true;
            }

            return false;
        },

        hasSurfix: function(str, surfix) {
            if (str && surfix && str.indexOf(surfix) === (str.length - surfix.length)) {
                return true;
            }

            return false;
        }
    });

    // general event binding.
    //$('#alertDialog .weui_mask').on('click', function(){
    //    YZ.Common.UI.dismiss();
    //});

    YZ.Const.mockable = (!YZ.Const.isProdMode && !YZ.Common.isWX);

    //for Require.js .
    return YZ;

}((typeof(jQuery) !== "undefined" ? jQuery : ((typeof(Zepto) !== "undefined" ? Zepto : undefined)))));
