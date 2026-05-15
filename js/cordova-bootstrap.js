(function () {
    function requestAndroidPermissions() {
        if (!window.cordova || !cordova.plugins || !cordova.plugins.permissions) {
            return;
        }

        const permissions = cordova.plugins.permissions;
        const requiredPermissions = [
            permissions.CAMERA,
            permissions.RECORD_AUDIO
        ];

        if (permissions.READ_MEDIA_IMAGES) {
            requiredPermissions.push(permissions.READ_MEDIA_IMAGES);
        } else if (permissions.READ_EXTERNAL_STORAGE) {
            requiredPermissions.push(permissions.READ_EXTERNAL_STORAGE);
        }

        permissions.requestPermissions(requiredPermissions, function () {}, function () {});
    }

    document.addEventListener('deviceready', requestAndroidPermissions, false);
}());