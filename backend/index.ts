import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor SIDEP local corriendo en http://localhost:${PORT}`);
    console.log(`🩺 Prueba la API abriendo en tu navegador: http://localhost:${PORT}/api/health`);
});