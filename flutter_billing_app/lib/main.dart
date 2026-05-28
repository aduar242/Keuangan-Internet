import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'providers/app_provider.dart';
import 'screens/login_screen.dart';
import 'screens/collector_dashboard.dart';

void main() async {
  // Ensure Flutter engine bindings are fully initialized
  WidgetsFlutterBinding.ensureInitialized();
  
  final appProvider = AppProvider();
  await appProvider.initializeApp();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider<AppProvider>.value(value: appProvider),
      ],
      child: const MainApp(),
    ),
  );
}

class MainApp extends StatelessWidget {
  const MainApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ISP Billing Management',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        primarySwatch: Colors.indigo,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4F46E5),
          primary: const Color(0xFF4F46E5),
          secondary: const Color(0xFF10B981),
        ),
        textTheme: GoogleFonts.interTextTheme(Theme.of(context).textTheme),
      ),
      // Automatically route user to dashboard if they have credentials saved offline
      home: Consumer<AppProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading) {
            return const Scaffold(
              backgroundColor: Color(0xFF0F172A),
              body: Center(
                child: CircularProgressIndicator(color: Colors.indigoAccent),
              ),
            );
          }
          
          if (provider.currentUser != null) {
            return const CollectorDashboard();
          }
          
          return const LoginScreen();
        },
      ),
    );
  }
}
