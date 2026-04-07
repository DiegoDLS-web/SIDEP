import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit {
  private http = inject(HttpClient);
  carros: any[] = [];

  ngOnInit() {
    // Usamos /api gracias al proxy que configuramos en angular.json
    this.http.get<any[]>('/api/carros').subscribe({
      next: (data) => this.carros = data,
      error: (err) => console.error('Error conectando al backend:', err)
    });
  }
}