<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
		<meta name="theme-color" content="#08090C">
		<title>登录 · VOLTA 库存管理后台</title>
		<!-- 样式：令牌 → 基线 → 骨架 → 公共组件 → 后台 -->
		<link href="/admin/images/volta_logo.png?v=20261020" rel="icon">
		<link href="/admin/images/volta_logo.png?v=20261020" rel="shortcut icon">
		<link rel="stylesheet" href="<?php echo e(asset('admin/css/tokens.css')); ?>">
		<link rel="stylesheet" href="<?php echo e(asset('admin/css/base.css')); ?>">
		<link rel="stylesheet" href="<?php echo e(asset('admin/css/layout.css')); ?>">
		<link rel="stylesheet" href="<?php echo e(asset('admin/css/components.css')); ?>">
		<link rel="stylesheet" href="<?php echo e(asset('admin/css/admin.css')); ?>">
		<link rel="stylesheet" href="<?php echo e(asset('admin/css/pages.css')); ?>">
		<!-- 登录页 scoped 样式 -->
	</head>
	<body class="login-page">
		<div class="admin-shell atmosphere">
			<main class="admin-login">
				<!-- 顶栏：主题切换按钮，HTML 里直接写死，JS 只绑事件 -->
				<div class="admin-login__topbar">
					<button type="button" class="icon-btn" data-action="toggle-theme" aria-label="切换到日间模式">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
							stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
							<circle cx="12" cy="12" r="4" />
							<path
								d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
						</svg>
					</button>
				</div>

				<!-- 登录表单：HTML 里直接写完整结构 -->
				<div id="login-root">
					<form class="admin-login__card" data-form="login" novalidate>
						<div class="admin-login__head">
							<span class="admin-login__mark" aria-hidden="true">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
									stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
									aria-hidden="true">
									<path d="M13 4 L6 13.5 H11 L10 20 L18 10.5 H12.5 Z" />
								</svg>
							</span>
							<span class="eyebrow">VOLTA CONSOLE</span>
							<h1 class="display-2 admin-login__title">库存管理后台</h1>
							<p class="admin-login__hint">
								演示手机号：<span class="mono" data-bind="demo.username">13182796613</span>
								密码：<span class="mono" data-bind="demo.password">admin123</span>
								<br><span style="opacity:.6">（手机号登录，绑定管理员数据表实时校验）</span>
							</p>
						</div>
						<div class="admin-login__form">
							<div class="admin-login__field">
								<label class="field__label" for="admin-user">手机号</label>
								<input id="admin-user" class="input" type="tel" autocomplete="tel" maxlength="11"
									placeholder="请输入手机号" name="username" />
							</div>
							<div class="admin-login__field">
								<label class="field__label" for="admin-pass">密码</label>
								<div class="input-with-icon">
									<input id="admin-pass" class="input" type="password" autocomplete="current-password"
										placeholder="请输入登录密码" name="password" />
									<button type="button" class="input-with-icon__btn" data-action="toggle-pass"
										aria-label="显示/隐藏密码">
										<svg class="eye-icon eye-icon--open" width="18" height="18" viewBox="0 0 24 24"
											fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"
											stroke-linejoin="round" aria-hidden="true">
											<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
											<circle cx="12" cy="12" r="3" />
										</svg>
										<svg class="eye-icon eye-icon--closed" width="18" height="18"
											viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
											stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
											<path
												d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.78 19.78 0 0 1 4.22-5.17M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.78 19.78 0 0 1-3.17 4.19M1 1l22 22" />
											<path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
										</svg>
									</button>
								</div>
							</div>
							<button type="submit" class="btn btn--primary btn--block">登录后台</button>
							<div class="admin-login__actions">
								<button type="button" class="btn btn--ghost btn--sm"
									data-action="fill-demo">填入演示手机号</button>
							</div>
						</div>
					</form>
				</div>
			</main>
		</div>
		<!-- Toast 容器：HTML 里直接写固定结构，JS 往里塞 toast 条目 -->
		<div data-mount="toast-host">
			<div class="toast-host" role="status" aria-live="polite"></div>
		</div>

		<!-- jQuery 本地引入 -->
		<script src="<?php echo e(asset('admin/js/vendor/jquery.min.js')); ?>"></script>
		<script src="<?php echo e(asset('admin/js/core/enter-nav.js')); ?>"></script>
		<!-- 公共层：登录页不引 admin-layout.js，也不引 store-products/orders/members -->
		<script src="<?php echo e(asset('admin/js/core/storage.js')); ?>"></script>
		<script src="<?php echo e(asset('admin/js/core/format.js')); ?>"></script>
		<script src="<?php echo e(asset('admin/js/core/data.js')); ?>"></script>
		<script src="<?php echo e(asset('admin/js/core/store-ui.js')); ?>"></script>
		<script src="<?php echo e(asset('admin/js/core/store-admins.js')); ?>?v=20261020a"></script>
		<script src="<?php echo e(asset('admin/js/core/store-admin.js')); ?>?v=20261021b"></script>
		<script src="<?php echo e(asset('admin/js/core/admin-auth.js')); ?>"></script>
		<script src="<?php echo e(asset('admin/js/core/components-admin.js')); ?>"></script>
		<!-- 页面逻辑 -->
		<script src="<?php echo e(asset('admin/js/pages/login.js')); ?>?v=20261020a"></script>
	</body>
</html><?php /**PATH E:\Users\燁\Desktop\测试\api-server\resources\views/admin/login.blade.php ENDPATH**/ ?>