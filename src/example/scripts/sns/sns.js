/**
 * Created by cup on 8/30/16.
 */

require(['jquery', 'swiper', 'commonJS', 'handlebars'], function($, Swiper, YZ, Handlebars){

    // Initialize Swiper
    var swiper = new Swiper('.swiper-container', {
        pagination: '.swiper-pagination',
        effect: 'coverflow',
        grabCursor: true,
        centeredSlides: true,
        slidesPerView: 'auto',
        coverflow: {
            rotate: 50,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows : true
        }
    });

    console.log('Got DOMContentLoaded');
    console.log('>>>' + location.href);
//debugger

    if (YZ.Const.isProdMode) {
        /*
         https://www.wygreen.cn/alopay/prod/wechat.php?appName=alopayN
         */
        _appName = YZ.Const.AppName.DuoShouQian;
    }
    else {
        /*
         https://www.wygreen.cn/alopay/wechat.php?appName=testaccount
         */
        _appName = YZ.Const.AppName.TestEnv;
    }

    YZ.Common.config(_appName);

//debugger
    // friends timeline
    // whole loop msg loop
    //$('section.timeline').append((Handlebars.compile($('#timeline-template').html()))(snsDataMgr.timeline));

    // image loop for each entry
    //$('.msg_timeline .timeline .images').append((Handlebars.compile($('#timeline-images-template').html()))(snsDataMgr.timeline));

    function afterChooseImagesCB(res) {
        var localIds = res.localIds; // 返回选定照片的本地ID列表，localId可以作为img标签的src属性显示图片s
        if(localIds && localIds.length) {
            // Save to local
            $('.wx_selected_images').append(Handlebars.compile($('#wx-selected-images-template').html())({localIds: localIds}));
        }
    }

    // bind click event.
    $('.weui_tabbar').on('click', '.timeline', function () {
        // 朋友圈
        $('section').hide();
        $('section.timeline').show();

    }).on('click', '.discover', function () {
        // 发现
        $('section').hide();
        $('section.discover').show();

    }).on('click', '.mine', function () {
        // 我的
        $('section').hide();
        $('section.mine').show();

    }).on('click', '.upload', function () {
        // 我要上传
        $('section').hide();
        $('section.upload').show();

        YZ.Common.fetchJSSignatureNew(function(wx){
            var $self = $(this);

            // 获取图片。
            wx.chooseImage({
                count: 9, // 默认9
                sizeType: ['compressed'], // 'original', 可以指定是原图还是压缩图，默认二者都有
                //sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
                success: afterChooseImagesCB
            });

            //function setImage($parent, localId) {
            //    console.log('localIds[0] = ' + localIds[0]);
            //    item.find('img').attr('src', localIds[0]);
            //}

            $('.register-btn').on('click', function(){
                // upload image to wx server.
                var phone = $("input[name='phone']").val();
                if(!YZ.Common.isValidPhone(phone)) {
                    commonUI.showPopup('手机号码输入不正确, 请检查您的输入!');
                    return;
                }

                var cardFront = $('.card-front img').attr('src'),
                    cardBack = $('.card-Back img').attr('src'),
                    license = $('.license-card img').attr('src');

                //if(!cardFront || !cardBack) {
                //    commonUI.showPopup('身份证正反面都必须拍照才能开通支付功能!');
                //    return;
                //}

                var $self = $(this),
                    serverIds = {};

                $self.attr("disabled", "disabled");

                function uploadImageOneByOne(index, cb) {
                    if (index >= uploads.length) {
                        $.isFunction(cb) && cb();
                        return;
                    }

                    var $img = uploads[index].find('img'),
                        wxImgId = $img.attr('src');

                    if(wxImgId) {
                        wx.uploadImage({
                            localId: wxImgId, // 需要上传的图片的本地ID，由chooseImage接口获得
                            isShowProgressTips: 1, // 默认为1，显示进度提示
                            success: function (res) {
                                var serverId = res.serverId; // 返回图片的服务器端ID
                                //    var $img = item.find('img'),
                                //        localId = $img.attr('src');
                                //
                                //$img.data('serverId', serverId);
                                //serverIds[index] = serverId;
                                serverIds[$img.data('key')] = serverId;

                                // upload the next one to wx server.
                                uploadImageOneByOne(index + 1, cb);
                            }
                        });
                    }
                    else {
                        // set empty str if no image available.
                        //serverIds[index] = 'aa';
                        //serverIds.push('');
                        serverIds[$img.data('key')] = '';

                        // upload the next one to wx server.
                        uploadImageOneByOne(index + 1, cb);
                    }
                }

                uploadImageOneByOne(0, function(){
                    // then send register data to php server.
                    commonUI.showLoading();
//debugger
                    YZ.Common.ajax2BackendByPhp({
                        type: 'POST',
                        action: 'mchntRegister',
                        params: {
                            id: YZ.Pay.requestCommands.Register,
                            "phone": phone,
                            "serverIds": serverIds
                        },
                        success: function (resp) {
                            // login success
                            commonUI.dismiss();
                            commonUI.showToast('材料提交成功，支付渠道申请中...', function(){
                                // set toast time.
                            });
                        },
                        complete: function(){
                            // recover btn status.
                            $self.removeAttr("disabled");
                        }
                    });
                });
            });

        }, null, [
            'chooseImage',
            'uploadImage'
        ]);
    });

    //$('.weui_tabbar').on('click', '.upload_image', function () {
    //
    //});

});
