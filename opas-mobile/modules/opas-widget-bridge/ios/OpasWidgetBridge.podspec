Pod::Spec.new do |s|
  s.name           = 'OpasWidgetBridge'
  s.version        = '1.0.0'
  s.summary        = 'Hands the next deadline to the Opas home-screen widget.'
  s.author         = ''
  s.homepage       = 'https://opas.app'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end
