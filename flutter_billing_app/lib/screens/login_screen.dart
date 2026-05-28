import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../providers/app_provider.dart';
import 'collector_dashboard.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _serverController = TextEditingController(text: "https://");
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    // Pre-fill URL if already stored
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = Provider.of<AppProvider>(context, listen: false);
      if (provider.apiBaseUrl.isNotEmpty && provider.apiBaseUrl != "https://your-api-url.com") {
        _serverController.text = provider.apiBaseUrl;
      }
    });
  }

  @override
  void dispose() {
    _serverController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final provider = Provider.of<AppProvider>(context, listen: false);
    try {
      final success = await provider.loginUser(
        _serverController.text.trim(),
        _usernameController.text.trim(),
        _passwordController.text.trim(),
      );

      if (success) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Selamat Datang, ${provider.currentUser?.name}!"),
            backgroundColor: Colors.emerald,
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const CollectorDashboard()),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Login gagal: ${e.toString().replaceAll("Exception: ", "")}"),
          backgroundColor: Colors.rose,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Slate 900
      body: Stack(
        children: [
          // Background Gradient Circles for Visual Aesthetics
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.indigo.withOpacity(0.15),
              ),
            ),
          ),
          Positioned(
            bottom: -80,
            left: -80,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.violet.withOpacity(0.15),
              ),
            ),
          ),
          
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 30.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Logo Icon
                      Center(
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 500),
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.indigo[500]!.withOpacity(0.3),
                            border: Border.all(color: Colors.indigo[400]!.withOpacity(0.5), width: 2),
                          ),
                          child: const Icon(
                            Icons.wifi_tethering,
                            size: 48,
                            color: Colors.indigoAccent,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      
                      // Heading
                      Text(
                        "ISP NETWORK",
                        textAlign: TextAlign.center,
                        style: GoogleFonts.spaceGrotesk(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: 2,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "Aplikasi Penagihan dan Keuangan Lapangan",
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF94A3B8), // Slate 400
                        ),
                      ),
                      const SizedBox(height: 40),
                      
                      // Server Domain / URL Field
                      Text(
                        "ALAMAT SERVER API",
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF64748B), // Slate 500
                          letterSpacing: 1.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _serverController,
                        style: GoogleFonts.jetBrainsMono(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.dns, color: Colors.indigoAccent),
                          hintText: "domain.com atau IP",
                          hintStyle: GoogleFonts.inter(color: Colors.slate),
                          filled: true,
                          fillColor: const Color(0xFF1E293B), // Slate 800
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                            borderSide: BorderSide.none,
                          ),
                          errorStyle: GoogleFonts.inter(color: Colors.amber, fontSize: 11),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty || value == "https://") {
                            return "Mohon masukkan alamat server API.";
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 20),

                      // Username Field
                      Text(
                        "USERNAME PETUGAS",
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF64748B),
                          letterSpacing: 1.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _usernameController,
                        style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.person, color: Colors.indigoAccent),
                          hintText: "Username Anda",
                          hintStyle: GoogleFonts.inter(color: Colors.slate),
                          filled: true,
                          fillColor: const Color(0xFF1E293B),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                            borderSide: BorderSide.none,
                          ),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty) ? "Username wajib diisi." : null,
                      ),
                      const SizedBox(height: 20),

                      // Password Field
                      Text(
                        "PASSWORD",
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF64748B),
                          letterSpacing: 1.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.semibold),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.lock, color: Colors.indigoAccent),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off : Icons.visibility,
                              color: Colors.indigoAccent,
                            ),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          ),
                          hintText: "Password",
                          hintStyle: GoogleFonts.inter(color: Colors.slate),
                          filled: true,
                          fillColor: const Color(0xFF1E293B),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                            borderSide: BorderSide.none,
                          ),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty) ? "Password wajib diisi." : null,
                      ),
                      const SizedBox(height: 40),

                      // Login Button
                      SizedBox(
                        height: 56,
                        child: ElevatedButton(
                          onPressed: provider.isLoading ? null : _handleLogin,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.indigoAccent,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(18),
                            ),
                            elevation: 8,
                            shadowColor: Colors.indigoAccent.withOpacity(0.4),
                          ),
                          child: provider.isLoading
                              ? const SpinKitThreeBounce(color: Colors.white, size: 24)
                              : Text(
                                  "MASUK APLIKASI",
                                  style: GoogleFonts.spaceGrotesk(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 14,
                                    letterSpacing: 1.2,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      
                      // Bottom version string
                      Text(
                        "v1.0.0 (Offline-First Ready)",
                        textAlign: TextAlign.center,
                        style: GoogleFonts.jetBrainsMono(
                          color: const Color(0xFF475569),
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
