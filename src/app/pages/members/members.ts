import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  status: 'Active' | 'On-Leave';
  joinedDate: string;
}

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './members.html',
  styleUrl: './members.css'
})
export class MembersComponent implements OnInit {
  searchText: string = '';
  roleFilter: string = 'All';

  members: StaffMember[] = [
    {
      id: 'MBR-001',
      name: 'M. Senthil Nathan',
      role: 'Warehouse Lead',
      department: 'Main Inventory',
      phone: '+91 98765 43210',
      status: 'Active',
      joinedDate: '12-01-2024'
    },
    {
      id: 'MBR-002',
      name: 'R. Vigneshwar',
      role: 'Stock Incharge',
      department: 'LCC Operations',
      phone: '+91 98765 43211',
      status: 'Active',
      joinedDate: '15-03-2024'
    },
    {
      id: 'MBR-003',
      name: 'K. Anand Kumar',
      role: 'Dispatch Supervisor',
      department: 'Logistics',
      phone: '+91 98765 43212',
      status: 'Active',
      joinedDate: '01-06-2024'
    },
    {
      id: 'MBR-004',
      name: 'P. Deepa',
      role: 'Auditor & Data Analyst',
      department: 'Reports & Audits',
      phone: '+91 98765 43213',
      status: 'On-Leave',
      joinedDate: '20-08-2024'
    },
    {
      id: 'MBR-005',
      name: 'S. Rajesh',
      role: 'Warehouse Operator',
      department: 'Loading & Storing',
      phone: '+91 98765 43214',
      status: 'Active',
      joinedDate: '10-11-2024'
    }
  ];

  ngOnInit(): void {}

  get filteredMembers(): StaffMember[] {
    return this.members.filter(m => {
      const matchesSearch =
        !this.searchText ||
        m.name.toLowerCase().includes(this.searchText.toLowerCase()) ||
        m.role.toLowerCase().includes(this.searchText.toLowerCase()) ||
        m.department.toLowerCase().includes(this.searchText.toLowerCase()) ||
        m.id.toLowerCase().includes(this.searchText.toLowerCase());

      const matchesRole =
        this.roleFilter === 'All' || m.role.toLowerCase().includes(this.roleFilter.toLowerCase());

      return matchesSearch && matchesRole;
    });
  }

  get totalMembers(): number {
    return this.members.length;
  }

  get activeMembersCount(): number {
    return this.members.filter(m => m.status === 'Active').length;
  }
}
